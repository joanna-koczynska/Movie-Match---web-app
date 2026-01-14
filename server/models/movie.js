const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Movie = sequelize.define('Movie', {
    id: {
        type: DataTypes.INTEGER, 
        primaryKey: true,
        autoIncrement: false 
    },
  title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    poster_path: {
        type: DataTypes.STRING
    },
    overview: {
        type: DataTypes.TEXT
    },
    release_year: { 
        type: DataTypes.INTEGER
    }
}, {
    tableName: 'movie', 
    timestamps: false  
});


Movie.getRandomByGenreId = async function(genreId) {
    const Genre = sequelize.models.Genre; 
    return await Movie.findAll({
        include: [{
            model: Genre,
            where: { id: genreId },
            attributes: [],
            through: { attributes: [] }
        }],
        order: sequelize.random(),
        limit: 10
    });
};

module.exports = Movie;