const { DataTypes } = require('sequelize');
const sequelize = require('../config/postgres_db');

const Follower = sequelize.define('Follower', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    followerId: { 
        type: DataTypes.UUID,
        field: 'follower_id', // Twarde tłumaczenie na bazę!
        allowNull: false      // Zakaz wstawiania NULLi!
    },
    followedId: { 
        type: DataTypes.UUID,
        field: 'followed_id', // Twarde tłumaczenie na bazę!
        allowNull: false
    }
}, { 
    tableName: 'followers', 
    timestamps: false 
});

module.exports = Follower;