const mongoose = require('mongoose');
require('dotenv').config();
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
(async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECT, { useNewUrlParser: true, useUnifiedTopology: true });
    const user = await userModel.findOne({ email: 'anand@gmail.com' }).lean();
    console.log('user', user);
    const captain = await captainModel.findOne().lean();
    console.log('captain example', captain);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
})();
