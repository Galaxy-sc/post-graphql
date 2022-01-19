const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate')

const Schema = mongoose.Schema

const Article = Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    image: { type: String, required: true }
})

Article.plugin(mongoosePaginate)
Article.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'article'
})

module.exports = mongoose.model('Article', Article)