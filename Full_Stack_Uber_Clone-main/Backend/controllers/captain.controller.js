const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const rideService = require('../services/ride.service');
const blackListTokenModel = require('../models/blackListToken.model');
const { validationResult } = require('express-validator');


module.exports.registerCaptain = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle } = req.body;

    const { mobile } = req.body;

    const isCaptainAlreadyExist = await captainModel.findOne({ $or: [{ email }, { mobile }] });

    if (isCaptainAlreadyExist) {
        return res.status(400).json({ message: 'Captain with provided email or mobile already exists' });
    }


    const hashedPassword = await captainModel.hashPassword(password);

    const captain = await captainService.createCaptain({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        mobile,
        password: hashedPassword,
        color: vehicle.color,
        plate: vehicle.plate,
        capacity: vehicle.capacity,
        vehicleType: vehicle.vehicleType
    });

    const token = captain.generateAuthToken();

    res.status(201).json({ token, captain });

}

module.exports.loginCaptain = async (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const { email, password } = req.body;
    const captain = await captainModel
        .findOne({ $or: [{ email }, { mobile: email }] })
        .select('+password');

    if (!captain) {
        return res.status(401).json({
            message: 'Invalid email or password'
        });
    }

    const isMatch =
        await captain.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({
            message: 'Invalid email or password'
        });
    }

    // ✅ captain becomes active after login
    captain.status = 'active';
    captain.lastOnlineTime = new Date();

    await captain.save();

    const token = captain.generateAuthToken();

    res.cookie('token', token);

    res.status(200).json({
        token,
        captain
    });
}

module.exports.getCaptainProfile = async (req, res, next) => {
    res.status(200).json({ captain: req.captain });
}

module.exports.updateCaptainProfile = async (req, res, next) => {
    try {
        const captain = req.captain;
        const { fullname, email, mobile, vehicle } = req.body;

        if (fullname) {
            captain.fullname = captain.fullname || {};
            if (fullname.firstname) captain.fullname.firstname = fullname.firstname;
            if (fullname.lastname) captain.fullname.lastname = fullname.lastname;
        }

        if (email) captain.email = email;
        if (mobile) captain.mobile = mobile;

        if (vehicle) {
            captain.vehicle = captain.vehicle || {};
            if (vehicle.color) captain.vehicle.color = vehicle.color;
            if (vehicle.plate) captain.vehicle.plate = vehicle.plate;
            if (vehicle.capacity) captain.vehicle.capacity = vehicle.capacity;
            if (vehicle.vehicleType) captain.vehicle.vehicleType = vehicle.vehicleType;
        }

        await captain.save();

        res.status(200).json({ captain });
    } catch (err) {
        next(err);
    }
}

module.exports.getCaptainStats = async (req, res, next) => {
    try {
        const stats = await rideService.getCaptainStats(req.captain._id);
        res.status(200).json({ stats });
    } catch (error) {
        next(error);
    }
}

module.exports.logoutCaptain = async (req, res, next) => {

    const token =
        req.cookies.token ||
        req.headers.authorization?.split(' ')[1];

    await blackListTokenModel.create({ token });

    // ✅ captain becomes inactive after logout
    await captainModel.findByIdAndUpdate(
        req.captain._id,
        {
            status: 'inactive'
        }
    );

    res.clearCookie('token');

    res.status(200).json({
        message: 'Logout successfully'
    });
}