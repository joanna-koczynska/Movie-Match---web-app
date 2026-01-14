const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 


    const Watched = sequelize.define('Watched', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
   
        rating: { 
            type: DataTypes.FLOAT, 
            allowNull: true,
            defaultValue: 0 
        },
        movieId: { 
            type: DataTypes.INTEGER, 
            field: 'id_movie' 
        },
        userId: { 
            type: DataTypes.UUID, 
            field: 'id_user' 
        }
    }, { tableName: 'watched', timestamps: false });

    Watched.rateMovie = async function(userId, movieId, rating) {

        let entry = await Watched.findOne({
            where: { userId, movieId }
        });

        if (entry) {

            entry.rating = rating;
            await entry.save();
            return entry;
        } else {
           
            entry = await Watched.create({
                userId,
                movieId,
                rating
            });
            return entry;
        }
    };

    module.exports = Watched;