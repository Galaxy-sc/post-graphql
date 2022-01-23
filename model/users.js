const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate')
const jwt = require('jsonwebtoken')

const Schema = mongoose.Schema

const User = Schema({
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    gender: { type: String, default: "Male" },
    age: { type: Number, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true }
})

User.plugin(mongoosePaginate)

//? security

User.statics.createToken = async({ id, email }, screct, exp) => {
    return await jwt.sign({ id, email }, screct, { expiresIn: exp })
}

User.statics.checkToken = async(req, secret_token) => {
    const token = req.headers['token']
    if (token) {
        try {
            return await jwt.verify(token, secret_token)
        } catch (e) {
            const error = new Error('error occurred')
            throw error
        }
    } else {
        return null
    }
}

User.virtual('articles', {
    ref: 'Article',
    localField: '_id',
    foreignField: 'user'
})

module.exports = mongoose.model('User', User)