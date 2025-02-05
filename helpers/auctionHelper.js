const schedule = require('node-schedule');
const { Auction, User, sequelize } = require('../models');

/**
 * 경매 종료 스케줄을 등록하는 함수
 * @param {Object} good - Good 인스턴스
 * @param {Date} targetTime - 스케줄 등록 시각 (경매 시작 시 또는 종료 시)
 */
async function scheduleJob(good, targetTime) {
    schedule.scheduleJob(targetTime, async () => {
        try {
            const success = await Auction.findOne({
                where: { GoodId: good.id },
                order: [['bid', 'DESC']],
            });
            if (success) {
                await good.setSold(success.UserId);
                await User.update({
                    money: sequelize.literal(`money - ${success.bid}`),
                }, {
                    where: { id: success.UserId },
                });
            }
        } catch (error) {
            console.error('스케줄 작업 중 오류 발생:', error);
        }
    });
}

module.exports = {
    scheduleJob,
};