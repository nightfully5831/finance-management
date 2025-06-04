const jwt = require('jsonwebtoken')
import { StatusCodes } from 'http-status-codes'

export const Authenticate =
  (config = { authorize: true }) =>
  (req, res, next) => {
    let token = req.headers['x-access-token'] || req.headers['authorization']
    if (token) {
      token = token.slice(7, token.length) // Remove "Bearer " from the token string
      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
        if (decoded) {
          req.user = decoded // Attach the decoded payload to req.user
          return next()
        } else {
          res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Token is not valid, please login again' })
        }
      })
    } else {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Auth token is not supplied',
      })
    }
  }
