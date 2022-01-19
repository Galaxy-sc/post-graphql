const mongoose = require('mongoose')

const Schema = mongoose.Schema

const Comment = Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" },
    article: { type: Schema.Types.ObjectId, ref: "Article" },
    title: { type: String, required: true },
    body: { type: String, required: true }
})

module.exports = mongoose.model('Comment', Comment)