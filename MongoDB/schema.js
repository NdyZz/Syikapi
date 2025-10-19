const mongoose = require('mongoose');

const Users = mongoose.Schema({
    username: { type: String },
    password: { type: String},
    email: { type: String },
    apikey: { type: String },
    defaultKey: { type: String },
    premium: { type: Array },
    limit: { type: Number }
}, { versionKey: false });
module.exports.User = mongoose.model('user', Users);

const Visitors = mongoose.Schema({
    id: { type: String },
    hit: { type: Number, default: 1}
}, { versionKey: false });
module.exports.Visitor = mongoose.model('visitors', Visitors);