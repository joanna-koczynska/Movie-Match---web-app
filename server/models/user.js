const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 
const bcrypt = require('bcrypt'); 


const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    legacy_id: {
        type: DataTypes.INTEGER,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
    },
    surname: {
        type: DataTypes.STRING,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'users', 
    timestamps: false
});


User.signup = async function(username, email, password) {

    const exists = await User.findOne({ where: { email } });
    if (exists) {
        throw new Error("Użytkownik o takim emailu już istnieje!");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);


    const user = await User.create({
        username: username,
        email: email,
        password: hashedPassword
    });

    return user;
};


User.authenticate = async function(email, password) {

    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new Error("Nieprawidłowy email lub hasło"); 
    }


    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        throw new Error("Nieprawidłowy email lub hasło");
    }


    return {
        id: user.id,
        username: user.username,
        email: user.email
    };
};

module.exports = User;