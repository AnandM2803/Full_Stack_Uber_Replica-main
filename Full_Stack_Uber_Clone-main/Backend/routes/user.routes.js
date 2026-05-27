const express = require('express');
const router = express.Router();
const { body } = require("express-validator")
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');


router.post('/register', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('mobile').optional().isMobilePhone('any').withMessage('Invalid mobile number'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
],
    userController.registerUser
)

router.post('/login', [
    body('email').custom((value) => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phonePattern = /^\+?\d{7,15}$/
        if (emailPattern.test(value) || phonePattern.test(value)) {
            return true
        }
        throw new Error('Invalid email or mobile number')
    }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
],
    userController.loginUser
)

router.get('/profile', authMiddleware.authUser, userController.getUserProfile)
router.put('/profile', authMiddleware.authUser, userController.updateUserProfile)

router.get('/logout', authMiddleware.authUser, userController.logoutUser)



module.exports = router;