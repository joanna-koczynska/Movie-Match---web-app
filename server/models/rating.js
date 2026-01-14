const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');
const Movie = require('./movie');

const Rating = sequelize.define('Rating', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
userId: {
        type: DataTypes.UUID,
        references: {
            model: User,
            key: 'id'
        },
        field: 'id_user' 
    },
    movieId: {
        type: DataTypes.INTEGER,
        references: {
            model: Movie,
            key: 'id'
        },
        field: 'id_movie'
    },
    rating: {
        type: DataTypes.FLOAT,
    }
}, {
    tableName: 'rating', 
    timestamps: false
});

module.exports = Rating;