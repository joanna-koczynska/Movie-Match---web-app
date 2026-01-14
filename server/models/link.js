const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Movie = require('./movie');

const Link = sequelize.define('Link', {
movieId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: Movie,
            key: 'id'
        },
        field: 'movieid' 
    },
    imdbId: {
        type: DataTypes.INTEGER,
        field: 'imdbid' 
    },
    tmdbId: {
        type: DataTypes.INTEGER,
        field: 'tmdbid' 
    }
}, {
    tableName: 'links', 
    timestamps: false
});

module.exports = Link;