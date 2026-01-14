const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tag = sequelize.define('Tag', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID, 
        references: {
            model: 'USERS',
            key: 'id'
        },
        field: 'id_user' 
    },
    movieId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'MOVIE',
            key: 'id'
        },
        field: 'id_movie'
    },
    tag: {
        type: DataTypes.TEXT 
    },
    timestamp: {
        type: DataTypes.BIGINT
    }
}, {
    tableName: 'tags',
    timestamps: false
});

module.exports = Tag;