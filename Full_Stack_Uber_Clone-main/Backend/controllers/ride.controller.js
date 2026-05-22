const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');


module.exports.createRide = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const { pickup, destination, vehicleType } = req.body;
    console.log(req.user)

    try {

        // create ride
        const ride = await rideService.createRide({
            user: req.user._id,
            pickup,
            destination,
            vehicleType
        });

        // get pickup coordinates
        const pickupCoordinates =
            await mapService.getAddressCoordinate(pickup);

        // find nearby captains
        const captainsInRadius =
            await mapService.getCaptainsInTheRadius(
                pickupCoordinates.lat,
                pickupCoordinates.lng,
                30
            );

        console.log("Captains Found:", captainsInRadius);

        // hide otp before sending popup
        // ride.otp = "";

        // populate user data
        const rideWithUser =
            await rideModel.findOne({
                _id: ride._id
            }).populate('user');

        // send popup to captains
        captainsInRadius.map(captain => {

            console.log("Sending popup to:", captain.socketId);

            sendMessageToSocketId(
                captain.socketId,
                {
                    event: 'new-ride',
                    data: rideWithUser
                }
            );

        });

        // send ride response to rider
        const rideWithOtp =
    await rideModel.findOne({
        _id: ride._id
    }).select('+otp');

return res.status(201).json(rideWithOtp);

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: err.message
        });

    }

};

module.exports.getFare = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {

        const fare =
            await rideService.getFare(pickup, destination);

        return res.status(200).json(fare);

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: err.message
        });

    }

};

module.exports.confirmRide = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const { rideId } = req.body;

    try {

        let ride =
            await rideService.confirmRide({
                rideId,
                captain: req.captain
            });

        // fetch ride with otp
        ride = await rideModel.findOne({
            _id: ride._id
        })
        .populate('user')
        .populate('captain')
        .select('+otp');

        // send updated ride to rider
       sendMessageToSocketId(
    ride.user.socketId,
    {
        event: 'ride-confirmed',
        data: {
            _id: ride._id,
            pickup: ride.pickup,
            destination: ride.destination,
            fare: ride.fare,
            status: ride.status,
            otp: ride.otp,
            captain: ride.captain,
            user: ride.user
        }
    }
);

        if (ride.captain?.location?.lat != null && ride.captain?.location?.lng != null) {
            sendMessageToSocketId(
                ride.user.socketId,
                {
                    event: 'captain-location-update',
                    data: {
                        rideId: ride._id,
                        location: {
                            lat: ride.captain.location.lat,
                            lng: ride.captain.location.lng,
                        },
                    },
                }
            );
        }

        return res.status(200).json(ride);

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: err.message
        });

    }
};

module.exports.startRide = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const { rideId, otp } = req.query;

    try {

        const ride =
            await rideService.startRide({
                rideId,
                otp,
                captain: req.captain
            });

        sendMessageToSocketId(
            ride.user.socketId,
            {
                event: 'ride-started',
                data: ride
            }
        );

        return res.status(200).json(ride);

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: err.message
        });

    }
};

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-ended',
            data: ride
        });

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}