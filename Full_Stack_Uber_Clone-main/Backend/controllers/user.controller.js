const userModel = require('../models/user.model');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blackListToken.model');

module.exports.registerUser = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password } = req.body;

    const { mobile } = req.body;

    // check if email or mobile already exists
    const isUserAlready = await userModel.findOne({ $or: [{ email }, { mobile }] });

    if (isUserAlready) {
        return res.status(400).json({ message: 'User with provided email or mobile already exists' });
    }

    const hashedPassword = await userModel.hashPassword(password);

    const user = await userService.createUser({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        mobile,
        password: hashedPassword
    });

    const token = user.generateAuthToken();

    res.status(201).json({ token, user });


}

module.exports.loginUser = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body; // email may contain mobile number as well

    const user = await userModel.findOne({ $or: [{ email }, { mobile: email }] }).select('+password');

    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = user.generateAuthToken();
    // mark user as just logged in (track session start)
    try {
        user.lastOnlineTime = new Date();
        await user.save();
    } catch (err) {
        console.log('Failed to update user lastOnlineTime', err);
    }

    res.cookie('token', token);

    res.status(200).json({ token, user });
}

module.exports.getUserProfile = async (req, res, next) => {

    res.status(200).json(req.user);

}

module.exports.updateUserProfile = async (req, res, next) => {
    try {
        const user = req.user;
        const { fullname, email, mobile } = req.body;

        if (fullname) {
            user.fullname = user.fullname || {};
            if (fullname.firstname) user.fullname.firstname = fullname.firstname;
            if (fullname.lastname) user.fullname.lastname = fullname.lastname;
        }

        if (email) user.email = email;
        if (mobile) user.mobile = mobile;

        await user.save();

        res.status(200).json({ user });
    } catch (err) {
        next(err);
    }
}

module.exports.logoutUser = async (req, res, next) => {
    res.clearCookie('token');
    const token = req.cookies.token || req.headers.authorization.split(' ')[ 1 ];

    await blackListTokenModel.create({ token });

    res.status(200).json({ message: 'Logged out' });

}