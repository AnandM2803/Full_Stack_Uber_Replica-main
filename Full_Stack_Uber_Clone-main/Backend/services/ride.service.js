const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const getFare = async (pickup, destination) => {

    if (!pickup || !destination) {
        throw new Error('Pickup and destination required');
    }

    const distanceTime =
        await mapService.getDistanceTime(pickup, destination);

    const baseFare = {
        auto: 30,
        car: 50,
        moto: 20
    };

    const perKmRate = {
        auto: 10,
        car: 15,
        moto: 8
    };

    const perMinuteRate = {
        auto: 2,
        car: 3,
        moto: 1.5
    };

    const distance =
        distanceTime.distance.value / 1000;

    const duration =
        distanceTime.duration.value / 60;

    return {
        auto:
            Math.round(
                baseFare.auto +
                distance * perKmRate.auto +
                duration * perMinuteRate.auto
            ),

        car:
            Math.round(
                baseFare.car +
                distance * perKmRate.car +
                duration * perMinuteRate.car
            ),

        moto:
            Math.round(
                baseFare.moto +
                distance * perKmRate.moto +
                duration * perMinuteRate.moto
            )
    };
};

module.exports.getFare = getFare;

function getOtp(num) {
    function generateOtp(num) {
        const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
        return otp;
    }
    return generateOtp(num);
}


module.exports.createRide = async ({
    user, pickup, destination, vehicleType
}) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw new Error('All fields are required');
    }

    const fare = await getFare(pickup, destination);



    const ride = rideModel.create({
        user,
        pickup,
        destination,
        otp: getOtp(6),
        fare: fare[ vehicleType ]
    })

    return ride;
}

module.exports.confirmRide = async ({ rideId, captain }) => {

    if (!rideId) {
        throw new Error("Ride ID is required");
    }

    await rideModel.findOneAndUpdate(
        { _id: rideId },
        {
            status: "accepted",
            captain: captain._id
        }
    );

    const ride =
        await rideModel.findOne({ _id: rideId })
            .populate("user")
            .populate("captain")
            .select("+otp");

    if (!ride) {
        throw new Error("Ride not found");
    }

    return ride;
};

module.exports.startRide = async ({ rideId, otp, captain }) => {

    if (!rideId || !otp) {
        throw new Error("Ride ID and OTP required");
    }

    const ride =
        await rideModel.findOne({
            _id: rideId
        }).populate("user")
          .populate("captain")
          .select("+otp");

    if (!ride) {
        throw new Error("Ride not found");
    }

    if (ride.status !== "accepted") {
        throw new Error("Ride not accepted yet");
    }

    if (ride.otp !== otp) {
        throw new Error("Invalid OTP");
    }

    await rideModel.findOneAndUpdate(
        { _id: rideId },
        { status: "ongoing" }
    );

    return ride;
};

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'ongoing') {
        throw new Error('Ride not ongoing');
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'completed'
    })

    return ride;
}

