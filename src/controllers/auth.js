// * Libraries
import { StatusCodes } from 'http-status-codes'
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { User } from '../models'
import { asyncMiddleware } from '../middlewares'
import { comparePassword, generatePassword, generateToken } from '../utils'

import dotenv from 'dotenv'

dotenv.config()

export const CONTROLLER_AUTH = {
  signUp: asyncMiddleware(async (req, res) => {
    const { name, email, parent, role, password } = req.body
    // Check if user already exists
    const user = await User.findOne({ email })
    if (user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Email already exists.',
      })
    }
    const hashedPassword = await generatePassword(password)

    const newUser = new User({
      name,
      email,
      parent,
      role,
      password: hashedPassword,
    })
    await newUser.save()

    if(name !== undefined) {
      const tokenPayload = {
        _id: newUser._id,
        role: newUser.role, // Ensure it's defined
      }
      const tokens = await generateToken(tokenPayload)
      res.status(StatusCodes.OK).json({
        data: {
          user: { ...newUser._doc },
          ...tokens,
        },
        message: 'User registered successfully',
      })
    } else {
      res.status(StatusCodes.OK).json({data:newUser, message:'successfully added!'})
    }
  }),

  signIn: asyncMiddleware(async (req, res) => {
    const { email, password } = req.body 
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found.',
      })
    }

    const isAuthenticated = await comparePassword(password, user.password)

    if (!isAuthenticated) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Incorrect Password or Email.',
      })
    }

    delete user.password

    const tokenPayload = {
      _id: user._id,
      role: user.role,
    }

    const tokens = await generateToken(tokenPayload)

    user.refreshTokens = [tokens.refreshToken]

    await user.save()

    res.status(StatusCodes.OK).json({
      data: {
        user: { ...user._doc },
        ...tokens,
      },
      message: 'Logged In Successfully',
    })
  }),

  signOut: asyncMiddleware(async (req, res) => {
    const { userId } = req.body

    const user = await User.findById(userId)

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }

    if (user) {
      (user.refreshTokens = ''), (user.accessToken = ''), await user.save()
    }

    res.status(StatusCodes.OK).json({ message: 'Logged out successfully' })
  }),

  updateUser: asyncMiddleware(async (req, res) => {
    const {name, email, password, userId} =req.body
    if (!userId || !name || !email) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Name, email, and userId are required.' })
    }

    const user = await User.findById(userId)
    if(!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found'})
    }

    if(user.email !== email) {
      const oldUser = await User.findOne({email: email})
      if(oldUser){
        return res.status(400).json({message: "already existed User!"})
      }
    }

    let hashedPassword;

    if(password) {
      hashedPassword = await generatePassword(password)
    }

    user.name = name, user.email = email, user.password = hashedPassword ;
    await user.save()

    const tokenPayload = {
      _id: user._id,
      role: user.role,
    }

    const tokens = await generateToken(tokenPayload)
    
    res.status(StatusCodes.OK).json({
      data: {
        user: { ...user._doc },
        ...tokens,
      },
      message: 'User profile successfully updated!'
    })
  }),

  getUser: asyncMiddleware(async (req, res) => {
    const {userId} =req.body
    if (!userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'userId is required.' })
    }

    const users = await User.find({parent: userId})
    if(users.length == 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found'})
    }
    
    res.status(StatusCodes.OK).json({
      users: users,
      message: 'User successfully downloaded!'
    })
  }),

  deleteUser: asyncMiddleware(async (req, res) => {
    const {email} = req.body

    if(!email) {
      return res.status(404).error({message: 'email needed'})
    }
    try {
      console.log('email', email)
      await User.deleteOne({email: email})
      return res.status(StatusCodes.OK).json({message: "successfully Removed"})
    } catch (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: error})
    }
    
  }),

  forgotPassword: asyncMiddleware(async (req, res) => {
    const { email } = req.body;

    const buffer = await crypto.randomBytes(20);
    const token = buffer.toString('hex');
    
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No account with that email address exists.',
      });
    }
    
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 300; // 5 minute available
    await user.save();
    const transporter = nodemailer.createTransport({
      service: 'Gmail', 
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_ADDRESS,
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) requested a password reset.\n\n
        Please click on the following link, or paste it into your browser to complete the process:\n\n
        ${process.env.REACT_APP_HOST_API}/auth/reset-password/${token}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(StatusCodes.OK).json({
      message: 'Password reset email sent.',
    });
  }),

  resetPassword: asyncMiddleware(async (req, res) => {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    
    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Password reset token is invalid or has expired.',
      });
    }
    
    const hashedPassword = await generatePassword(password);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_ADDRESS,
      subject: 'Your password has been changed!',
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`,
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(StatusCodes.OK).json({
      message: 'Password has been reset.',
    });
  }),

  verifyResetToken: asyncMiddleware(async (req, res) => {
    const { token } = req.params;
    console.log('token', token)
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    
    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Password reset token is invalid or has expired.',
      });
    }
    
    return res.status(StatusCodes.OK).json({
      message: 'Token is valid.',
    });
  })
}
