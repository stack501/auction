const { Op } = require('sequelize');
const { Good, Auction, User, sequelize } = require('./models');
const { scheduleJob } = require('./helpers/auctionHelper');

module.exports = async () => {
  console.log('checkAuction');
  try {
    
    const currentTime = new Date();
    const targets = await Good.findAll({ // 종료시간 < 현재시간 => 현재시간이 종료시간보다 크다는 것은 이미 경매종료된 상품
      where: {
        SoldId: null,
        endTime: { [Op.lt]: currentTime },
      },
    });
    targets.forEach(async (good) => {
        const t = await sequelize.transaction();
        try {
            const success = await Auction.findOne({
                where: { GoodId: good.id },
                order: [['bid', 'DESC']],
                transaction: t,
            });
            if (!success) { return; }
            await good.setSold(success.UserId, { transaction: t });
            await User.update({
                money: sequelize.literal(`money - ${success.bid}`),
            }, {
                where: { id: success.UserId },
                transaction: t,
            });
    
            await t.commit();
        } catch (error) {
            await t.rollback();
        }
    });
    const ongoing = await Good.findAll({ // 현재시간 > 시작시간 && 현재시간 < 종료시간 => 경매 진행중인 상품
      where: {
        SoldId: null,
        startTime: { [Op.lte]: currentTime },
        endTime: { [Op.gte]: currentTime},
      },
    });
    ongoing.forEach(async (good) => {
      const startDate = good.startDate;
      const endDate = good.endTime;
      if (currentTime < startDate) {
        await scheduleJob(good, startDate);
      } else {
          await scheduleJob(good, endDate);
      }
    });

  } catch (error) {
    console.error(error);
  }
};