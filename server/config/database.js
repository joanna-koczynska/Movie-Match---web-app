const { Sequelize } = require('sequelize');

const DB_NAME = 'postgres';   
const DB_USER = 'postgres';     
const DB_PASS = 'haslo';  
const DB_PORT = 5432; 

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: 'localhost', 
    dialect: 'postgres',
    port: DB_PORT,
    logging: false,
});

module.exports = sequelize;