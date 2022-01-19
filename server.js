const express = require('express')
const { ApolloServer, gql } = require('apollo-server-express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const validator = require('validator')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

const User = require('./model/users')
const Article = require('./model/articles')
const Comment = require('./model/comments')

const app = express()

mongoose.connect('mongodb://localhost:27017/graph')

app.use(express.static(path.join(__dirname, './imageUpload')))

let typeDefs = gql `

  type Query {
    user: User
    getAllUser(page: Int, limit: Int): userData
    getUser(id: ID!): User
    login(email: String!, password: String!): Token!
  }

  type Token {
    token: String!
    user: User
  }

  scalar Upload
  type Mutation {
    createUser(input: UserInput!): Token!
    createArticle(title: String!, body: String!, image: Upload!): Article!
  }

  type User {
    fname: String
    lname: String
    age: Int @deprecated(reason: "not use this")
    gender: Gender
    email: String
    password: String
    articles: [ Article ]
  }

  type Paginate {
    total: Int
    limit: Int
    page: Int
    pages: Int
  }

  type userData {
    users: [User]
    paginate: Paginate
  }
  
  enum Gender {
    Male
    Female
  }
  
  type Comment {
    user: ID
    article: Article
    title: String
    body: String
  }

  type Article {
    user: User
    title: String
    body: String
    image: String
    comments: [Comment]
  }


  input UserInput {
    fname: String!
    lname: String!
    age: Int!
    gender: Gender
    email: String!
    password: String!
  }

`

let resolvers = {
    Query: {
        getAllUser: async(parent, args, { check }) => {
            let page = args.page || 1
            let limit = args.limit || 10

            if (!check) {
                const error = new Error('کاربر اعتبار لازم را ندارد')
                throw error
            }
            const users = await User.paginate({}, { page, limit })
            return {
                users: users.docs,
                paginate: {
                    total: users.total,
                    limit: users.limit,
                    page: users.page,
                    pages: users.pages
                }
            }
        },
        getUser: async(parent, args) => {
            const user = await User.findById(args.id)
            return user
        },
        login: async(parent, args, { secret_token }) => {
            const user = await User.findOne({ 'email': args.email })
            if (!user) {
                const error = new Error('اکانت موجود نمیباشد')
                error.code = 401
                throw error
            }
            let isValid = await bcrypt.compare(args.password, user.password)
            if (!isValid) {
                const error = new Error('اکانت موجود نمیباشد')
                error.code = 401
                throw error
            }
            return {
                token: await User.createToken(user, secret_token, '1d'),
                user
            }
        }
    },
    //User registration
    Mutation: {
        createUser: async(parent, args, { secret_token }) => {
            const salt = bcrypt.genSaltSync(10)
            const hash = bcrypt.hashSync(args.input.password, salt)
            const errors = []
            if (validator.isEmpty(args.input.fname)) {
                errors.push({ message: "نامی انتخاب کنید !" })
            }
            if (!validator.isEmail(args.input.email)) {
                errors.push({ message: "ایمیلی انتخاب کنید !" })
            }
            if (errors.length > 0) {
                const error = new Error("invalid input")
                error.data = errors
                error.code = 422
                throw error
            }
            const user = await new User({
                fname: args.input.fname,
                lname: args.input.lname,
                age: args.input.age,
                gender: args.input.gender,
                email: args.input.email,
                password: hash
            })
            user.save()
            return {
                token: await User.createToken(user, secret_token, '1d'),
                user
            }
        },
        createArticle: async(parent, args, { check }) => {
            if (!check) {
                const error = new Error('کاربر اعتبار لازم را ندارد')
                throw error
            }

            const { createReadStream, filename } = await args.image
            const stream = createReadStream()
            const { filePath } = await saveImage({ stream, filename })

            let article = await Article.create({
                user: check.id,
                title: args.title,
                body: args.body,
                image: filePath
            })
            return article
        }
    },
    User: {
        articles: async(parent, args) => await Article.find({ user: parent.id })
    },
    Article: {
        comments: async(parent, args) => await Comment.find({ article: parent.id }),
        user: async(parent, args) => await User.findById(parent.user)
    }
}

let saveImage = ({ stream, filename }) => {
    let date = new Date()
    const dir = `/uploads/${date.getFullYear()}/${date.getMonth()}/${date.getDay()}`
    mkdirp.sync(path.join(__dirname, `/imageUpload${dir}`))

    const filePath = `${dir}/${filename}`

    return new promise((resolve, reject) => {
        stream.pipe(fs.createReadStream(path.join(__dirname, `/imageUpload/${filePath}`)))
            .on('error', error => reject(error))
            .on('finish', () => resolve({ filePath }))
    })
}

const startApolloServer = async() => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        formatError(err) {
            if (!err.originalError) {
                return err
            }
            const data = err.originalError.data
            const code = err.originalError.code || 500
            const message = err.message || 'error'
            return { data, status: code, message }
        },
        context: async({ req }) => {
            const secret_token = '*#@dadDAdCA21!!/?qwd109)_=qd1^'
            let check = await User.checkToken(req, secret_token)
            return {
                check,
                secret_token
            }
        }

    })
    await server.start()
    server.applyMiddleware({ app })
    app.listen(3000, () => { console.log('server run on port 3000 ...') })
}
startApolloServer()