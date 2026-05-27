const mongoose = require('mongoose');
require('dotenv').config();
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
(async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECT, { useNewUrlParser: true, useUnifiedTopology: true });
    const testUser = await userModel.create({ fullname: { firstname: 'Test', lastname: 'Mobile' }, email: 'mobiletest@example.com', mobile: '+919876543210', password: 'testpass' });
    const fetched = await userModel.findById(testUser._id).lean();
    console.log('created user', fetched);
    await userModel.findByIdAndDelete(testUser._id);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
})();
