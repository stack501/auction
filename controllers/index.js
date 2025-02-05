const { Op, where } = require('sequelize');
const { Good, Auction, User, sequelize } = require('../models');
const { scheduleJob } = require('../helpers/auctionHelper');

exports.renderMain = async (req, res, next) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // 어제 시간
    const goods = await Good.findAll({ 
      where: { SoldId: null, createdAt: { [Op.gte]: yesterday } },
    });
    res.render('main', {
      title: 'NodeAuction',
      goods,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.renderJoin = (req, res) => {
  res.render('join', {
    title: '회원가입 - NodeAuction',
  });
};

exports.renderGood = (req, res) => {
  res.render('good', { title: '상품 등록 - NodeAuction' });
};

exports.createGood = async (req, res, next) => {
  try {
    const { name, price, startTime, endTime } = req.body;

    //시작 시간이 현재 시간보다 이전인 경우 불가능하도록
    //종료 시간이 현재 시간보다 이전인 경우 불가능하도록
    const currentTime = new Date();

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 시작시간이 현재 시간보다 이전이면 에러 응답
    if (startDate < currentTime) {
    return res.status(400).send('경매 시작시간은 현재 시간보다 이후여야 합니다.');
    }
    
    // 종료시간이 현재 시간보다 이전이면 에러 응답
    if (endDate < currentTime) {
    return res.status(400).send('경매 종료시간은 현재 시간보다 이후여야 합니다.');
    }
    
    // 추가로, 시작시간이 종료시간보다 앞서야 합니다.
    if (startDate >= endDate) {
    return res.status(400).send('경매 종료시간은 경매 시작시간보다 이후여야 합니다.');
    }
    
    const good = await Good.create({
      OwnerId: req.user.id,
      name,
      img: req.file.filename,
      price,
      startTime: startDate,
      endTime: endDate,
    });

    if (currentTime < startDate) {
        await scheduleJob(good, startDate);
    } else {
        await scheduleJob(good, endDate);
    }

    res.redirect('/');
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.renderAuction = async (req, res, next) => {
    try {
        const [good, auction] = await Promise.all([
            Good.findOne({ 
                where: { id: req.params.id },
                include: {
                    model: User,
                    as: 'Owner',
                }
             }),
             Auction.findAll({
                where: { GoodId: req.params.id },
                include: { model: User},
                order: [['bid', 'ASC']],
            }),
        ]);
        res.render('auction', {
            title: `${good.name} - NodeAuction`,
            good,
            auction,
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};
exports.bid = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { bid, msg } = req.body;
        const good = await Good.findOne({
            where: { id: req.params.id },
            include: [
                { model: Auction },
                { model: User, as: 'Owner' },
            ],
            order: [[{ model: Auction }, 'bid', 'DESC']],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        const me = await User.findOne({
            where: { id: req.user.id },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!good) {
            await t.rollback();
            return res.status(404).send('해당 상품은 존재하지 않습니다.');
        }
        if (good.Owner.id === me.id) {
            await t.rollback();
            return res.status(403).send('상품 등록자는 참여할 수 없습니다.');
        }
        if (good.price >= bid) {
            await t.rollback();
            return res.status(403).send('시작 가격보다 높게 입찰해야 합니다.');
        }
        if (me.money < good.price) {
            await t.rollback();
            return res.status(403).send('금액이 부족합니다.');
        }
        if (new Date(good.createdAt).valueOf() + (24 * 60 * 60 * 1000) < new Date()) {
            await t.rollback();
            return res.status(403).send('경매가 이미 종료되었습니다.');
        }
        if (good.Auctions[0]?.bid >= bid) {
            await t.rollback();
            return res.status(403).send('이전 입찰가보다 높아야 합니다.');
        }
        const result = await Auction.create({
            bid,
            msg,
            UserId: req.user.id,
            GoodId: req.params.id,
        }, { transaction: t });

        await t.commit();

        req.app.get('io').to(req.params.id).emit('bid', {
            bid: result.bid,
            msg : result.msg,
            nick: req.user.nick,
        });
        return res.send('ok');
    } catch (error) {
        t.rollback();
        console.error(error);
        next(error);
    }
};
exports.renderList = async (req, res, next) => {
    try {
        const goods = await Good.findAll({
            where: { SoldId: req.user.id },
            include: { model: Auction },
            order: [[{ model: Auction }, 'bid', 'DESC']],
        })
        res.render('list', { title: '낙찰 목록 - NodeAuction', goods });
    } catch (error) {
        console.error(error);
        next(error);
    }
}