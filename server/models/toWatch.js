const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 

const ToWatch = sequelize.define('ToWatch', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    movieId: { 
        type: DataTypes.INTEGER,
        field: 'id_movie' 
    },
    userId: { 
        type: DataTypes.UUID, 
        field: 'id_user' 
    }
}, { tableName: 'to_watch', timestamps: false });



ToWatch.toggleMovie = async function(userId, movieId) {

    const existingEntry = await ToWatch.findOne({
        where: { userId, movieId }
    });

    if (existingEntry) {
     
        await existingEntry.destroy();
        return { message: "Usunięto z listy", added: false };
    } else {

        await ToWatch.create({ userId, movieId });
        return { message: "Dodano do listy", added: true };
    }
};
module.exports = ToWatch;