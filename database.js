const mongoose = require('mongoose');
require('dotenv').config();


function initMongoConnection(){
  let uri = process.env.DBUSERNAME+':'+process.env.PASSWORD
  let db = "@cluster0.6fxmse6.mongodb.net/presentio"
  console.log(uri)
  mongoose.connect("mongodb+srv://"+uri+db, {useNewUrlParser: true});
  console.log('Connection to mongo initiated')
  console.log(process.env.PASSWORD)
}

const userSchema = new mongoose.Schema({
  username : {type: String, unique: true},
  email: {type: String, unique: true},
  first: {type: String, default: ''},
  last: {type: String, default: ''},
  education: {type: String, default: ''},
  workingAt: {type: String, default: ''},
  role: {type: String, default: 'Software Developer'},
  password: String,
  website: {type: String, default: ''},
  likedIds: {type: [String], default: []},
  imageUrl: {type: String, default: ''}
});

const User = new mongoose.model('User', userSchema);

const devcardSchema = new mongoose.Schema({
  ownerId: String,
  views: {type: Number, default: 0},
  likes: {type: Number, default: 0},
  access: {type: String, default: 'Public'},
  theme: {type: String, default: 'Green Jungle'},
  description: {type:String, default: ''},
  socials: {type: [mongoose.Schema.Types.Mixed], default: []},
  skills: {type: [String], default: []},
  experiences: {type: [mongoose.Schema.Types.Mixed], default: []}
});

const Devcard = new mongoose.model('Devcard',  devcardSchema);



module.exports = {initMongoConnection, User, Devcard};
