const sequelize = require('../config/database');
const User = require('./user');
const Movie = require('./movie');
const Rating = require('./rating');
const Link = require('./link');
const Genre = require('./genre');
const Watched = require('./watched');
const ToWatch = require('./toWatch');
const Tag = require('./tag');

// Relacje User - Movie (poprzez Rating)
User.hasMany(Rating, { foreignKey: 'userId' });
Rating.belongsTo(User, { foreignKey: 'userId' });

Movie.hasMany(Rating, { foreignKey: 'movieId' });
Rating.belongsTo(Movie, { foreignKey: 'movieId' });

// Relacje Movie - Link
Movie.hasOne(Link, { foreignKey: 'movieId' });
Link.belongsTo(Movie, { foreignKey: 'movieId' });

// Relacje Movie - Genre (Many-to-Many)

Movie.belongsToMany(Genre, { 
    through: 'movie_genres', 
    foreignKey: 'id_movie',  
    otherKey: 'id_genre',    
    timestamps: false 
});

Genre.belongsToMany(Movie, { 
    through: 'movie_genres', 
    foreignKey: 'id_genre', 
    otherKey: 'id_movie',
    timestamps: false
});

// Relacje User - Watched
User.hasMany(Watched, { foreignKey: 'userId' });
Watched.belongsTo(User, { foreignKey: 'userId' });
Movie.hasMany(Watched, { foreignKey: 'movieId' });
Watched.belongsTo(Movie, { foreignKey: 'movieId' });

// Relacje User - ToWatch
User.hasMany(ToWatch, { foreignKey: 'userId' });
ToWatch.belongsTo(User, { foreignKey: 'userId' });
Movie.hasMany(ToWatch, { foreignKey: 'movieId' });
ToWatch.belongsTo(Movie, { foreignKey: 'movieId' });

// Relacje Tag
User.hasMany(Tag, { foreignKey: 'userId' });
Tag.belongsTo(User, { foreignKey: 'userId' });
Movie.hasMany(Tag, { foreignKey: 'movieId' });
Tag.belongsTo(Movie, { foreignKey: 'movieId' });

module.exports = {
    sequelize,
    User,
    Movie,
    Rating,
    Link,
    Genre,
    Watched,
    ToWatch,
    Tag
};