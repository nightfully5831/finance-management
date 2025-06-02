import { Schema, model } from 'mongoose'
import crypto from 'crypto'
import Joi from 'joi'

// User Schema
export const userSchema = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    parent: {
      type: String
    },
    role: {
      type: Number,
    },
    password: { 
      type: String, 
      required: true 
    },
    subscriptionID: {
      type: String,
    },
    refreshTokens: [String],
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    },
    trialEndsAt: { 
      type: Date, 
      required: true 
    },
    notifiedBeforeExpiry: { 
      type: Boolean, 
      default: false 
    },
  },
  { versionKey: false, timestamps: true }
)

// Token Generation Methods
userSchema.methods.createEmailVerifyToken = function () {
  const emailToken = crypto.randomBytes(32).toString('hex')
  this.emailToken = crypto.createHash('sha256').update(emailToken).digest('hex')
  return emailToken
}

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000
  return resetToken
}

// Joi Validation
export const validateRegistration = (obj) => {
  const schema = Joi.object({
    name: Joi.string(),
    email: Joi.string().email({ minDomainSegments: 2 }).required(),
    password: Joi.string().required(),
  }).options({ abortEarly: false })
  return schema.validate(obj)
}

export const User = model('User', userSchema)
