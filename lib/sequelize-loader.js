const fs = require('fs');
const path = require('path');


/**
 * Sequelize 모델을 스캔하고 초기화 후 반환하는 함수
 * @param {Object} sequelize - Sequelize 인스턴스
 * @param {String} modelsPath - 모델들이 위치한 디렉토리 경로
 * @returns {Object} 초기화된 db 객체
 */
function loadModels(sequelize, modelsPath) {
    const db = {};
    const basename = path.basename(__filename); //index.js

    fs.readdirSync(modelsPath)
        .filter(file => {
        //file.index('.') 은 숨기파일 제외 (.env같은 파일이 숨김파일)
        //index.js 제외
        //파일의 마지막 세자리가 .js 인 경우만 (js파일인 경우만)
        return (
            file.indexOf('.') !== 0 
            && file !== basename 
            && file !== 'index.js'
            && file.slice(-3) === '.js');
        })
        .forEach((file) => {
        const model = require(path.join(modelsPath, file));
        console.log(file, model.name);
        db[model.name] = model;
        model.initiate(sequelize);
        });

    Object.keys(db).forEach(modelName => {
    console.log(db, modelName);
    if (db[modelName].associate){
        db[modelName].associate(db);
    }
    });

    return db;
}

module.exports = {
    loadModels,
}