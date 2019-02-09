const User = require('../models/user')
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(process.env.CLIENT_ID);
const generateJWT = require('../helpers/generateJWT')
const bcrypt = require('bcryptjs');
const decode = require('../helpers/verifyUser')

class Controller {
    static login(req, res) {
        let userData;
        if (!req.body.token) {
            return User.findOne({
                email: req.body.email
            })
            .then(userFound => {
                if (!userFound) {
                    res
                        .status(404)
                        .json({
                            msg: `Email Not Found`
                        })    
                } else {
                    let decrypt = bcrypt.compareSync(req.body.password, userFound.password);
                    if (!decrypt) {
                        res
                            .status(404)
                            .json({
                                msg: `Password not match`
                            })  
                    } else {
                        let token = generateJWT(userFound)
                        res
                            .status(200)
                            .json(token)
                    }
                }
            })
            .catch(err => {
                console.log(err)
                res
                    .status(500)
                    .json({
                        msg: `Internal Server Error`,
                        err: err
                    })                
            })
        } else {
            client.verifyIdToken({
                idToken: req.body.token,
                audience: process.env.CLIENT_ID
            })
            .then(ticket => {
                const payload = ticket.getPayload()
                userData = payload
                return User.findOne({
                    email: payload.email
                })
            })
            .then(user => {
                if (!user) {
                    return User.create({
                        full_name: userData.name,
                        email: userData.email,
                        password: '0000'
                    })
                    .then(newUser => {
                        let token = generateJWT(newUser)
                        res
                            .status(200)
                            .json(token)
                    })
                } else {
                    let token = generateJWT(user)
                    res
                        .status(200)
                        .json(token)
                }
            })
            .catch(err => {
                console.log(err)
                res
                    .status(500)
                    .json({
                        msg: `Internal Server Error`,
                        err: err
                    })
            })
        }
    }

    static signup(req, res) {
        User.create(req.body)
        .then(newUser => {
            res
                .status(201)
                .json({
                    msg: `New user has been created`,
                    data: newUser
                })
        })
        .catch(err => {
            let modelValidation = ''
            if (err.errors.full_name) modelValidation = 'full_name'
            else if (err.errors.email) modelValidation = 'email'
            else modelValidation = 'password'
            res
                .status(500)
                .json({
                    msg: `Internal Server Error`,
                    err: err,
                    pathValidation: modelValidation
                })
        })
    }

    static decode(req, res) {
        try {
            let verify = decode(req.body.token)
            res.json(verify)
        } catch (err) {
            res
                .json({
                    msg: `Token Invalid`
                })
        }
    }
}


module.exports = Controller