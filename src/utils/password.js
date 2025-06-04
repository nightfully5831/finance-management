import _, { isEmpty } from 'lodash'
import bcrypt from 'bcrypt'

const saltRounds = 10

export const generatePassword = (password) => {
  return new Promise((resolve, reject) => {
    if (isEmpty(password)) {
      password = Array(10)
        .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
        .map((x) => x[Math.floor(Math.random() * x.length)])
        .join('')
    }

    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) reject(err)

      bcrypt.hash(password, salt, (err, hash) => {
        if (err) reject(err)

        resolve(hash)
      })
    })
  })
}

// ? @params password=The password user typed, hash=The password stored in DB
export const comparePassword = (password, hash) => {
  return new Promise((resolve, reject) => {
    if (isEmpty(password) || isEmpty(hash)) return resolve(false)
    bcrypt.compare(password, hash).then((isMatch) => {
      console.log(isMatch)
      if (isMatch) return resolve(true)
      else return resolve(false)
    })
  })
}
