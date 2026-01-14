const { DataTypes, QueryTypes } = require('sequelize');
const sequelize = require('../config/database'); 


const Genre = sequelize.define('Genre', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'genres', 
    timestamps: false
});



Genre.getBestRated = async function() {

    const query = `
        SELECT 
            g.id, 
            g.name, 
            AVG(r.rating) as avg_rating
        FROM genres g
        JOIN movie_genres mg ON g.id = mg.id_genre
        JOIN rating r ON mg.id_movie = r.id_movie
        GROUP BY g.id, g.name
        ORDER BY avg_rating DESC
        LIMIT 1;
    `;

    const result = await sequelize.query(query, { type: QueryTypes.SELECT });
    return result.length > 0 ? result[0] : null;
};

module.exports = Genre;