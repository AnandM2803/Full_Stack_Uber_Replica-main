const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blackListTokenModel = require('../models/blackListToken.model');
const captainModel = require('../models/captain.model');


module.exports.authUser = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }


    const isBlacklisted = await blackListTokenModel.findOne({ token: token });

    if (isBlacklisted) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded._id)

       if (!user) {

    return res.status(401).json({
        message: 'User not found'
    });

}

req.user = user;

return next();

    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports.authCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    console.log('Auth Captain - Token received:', !!token);
    console.log('Auth Captain - Headers:', req.headers.authorization);

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized - No token' });
    }

    const isBlacklisted = await blackListTokenModel.findOne({ token: token });

    if (isBlacklisted) {
        return res.status(401).json({ message: 'Unauthorized - Token blacklisted' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Auth Captain - Decoded:', decoded);
        
        const captain = await captainModel.findById(decoded._id)
       if (!captain) {
    console.log('Auth Captain - Captain not found for ID:', decoded._id);
    return res.status(401).json({
        message: 'Captain not found'
    });
}

req.captain = captain;

        return next()
    } catch (err) {
        console.log('Auth Captain Error:', err.message);

        res.status(401).json({ message: 'Unauthorized - ' + err.message });
    }
}