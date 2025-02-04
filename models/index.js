const Sequelize = require('sequelize');
const { loadModels } = require('../lib/sequelize-loader');

const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.json')[env];
const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config,
);

// 분리된 로더 함수를 통해 자동 스캔 및 db 객체 획득
const db = loadModels(sequelize, __dirname);
db.sequelize = sequelize;

module.exports = db;