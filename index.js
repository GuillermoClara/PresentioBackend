const express = require('express');
const cors = require('cors');
const parser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();

var corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true
}

app.use(function(req, res, next) {
res.header('Access-Control-Allow-Credentials', true);
res.header('Access-Control-Allow-Origin', req.headers.origin);
res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
if ('OPTIONS' == req.method) {
     res.send(200);
 } else {
     next();
 }
});

app.use(express.static("public"));

app.use(cors({credentials: true, origin: 'http://localhost:3000'}));
app.use(parser.urlencoded({
  extended: true
}));
app.use(express.json());

const database = require('./database.js');
database.initMongoConnection();

///////////////////////////////////////////////////////////////////////////////
// AUTH ENDPOINTS
//////////////////////////////////////////////////////////////////////////////

// Evaluate if sent cookies are valid
app.post('/auth/check',  async function(req, res){

  userCookie = req.body.user;

  console.log(userCookie)

  foundUser = await database.User.findOne({username: userCookie}).exec()

  let responseData = {
    valid: false
  }

  if(foundUser !== null){
    responseData.valid = true;
    responseData.username = userCookie;
    responseData.userId = foundUser._id;
  }



  res.json(responseData)

});

//Create an Account
app.post('/auth/signup', async function(req, res){

  //Get data from JSON
  first = req.body.first;
  last = req.body.last;
  username = req.body.username;
  email = req.body.email;
  password = req.body.password;


  //Prepare response object
  response = {
    valid: false,
    error: ''
  }


  // Check if user with that username and email already exists
  foundUser = await database.User.findOne({username: username}).exec();
  if(foundUser === null){

      foundUser = await database.User.findOne({email: email}).exec();

      if(foundUser === null){

        const hash = await bcrypt.hash(password, 5);

        response.valid = true

        let newUser = new database.User({
          username: username,
          email: email,
          first: first,
          last: last,
          password: hash
        });

        newUser.save();

        let newDevcard = new database.Devcard({
          ownerId: newUser._id
        });

        newDevcard.save();

      } else {
        response.error = 'Email is already taken!';
      }

  } else {
    response.error = 'Username is already taken!';
  }

  res.json(response);
});

// Verifies if given credentials are correct,
// Returns valid: true if it matches so it can
// be stored in cookies on client side
app.post('/auth/login', async function(req, res){

  username = req.body.username;
  password = req.body.password;

  //Prepare response object
  response = {
    valid: false
  }

  // Get user object from given username
  foundUser = await database.User.findOne({username: username}).exec();

  if(foundUser !== null){

    const hasMatch = await bcrypt.compare(password, foundUser.password);

    // If encrypted passwords match, return valid flag
    if(hasMatch){
      console.log('User authenticated')
      response.valid = true;
    } else {
      response.error = 'Incorrect password';
    }

  } else {
    response.error = 'User does not exist!'
  }

  res.json(response);

});

///////////////////////////////////////////////////////////////////////////////
// GET REQUESTS
//////////////////////////////////////////////////////////////////////////////

app.get('/user/:username',  async function(req, res){

    username = req.params.username;


    response = {
      valid: false,
      userData: null
    }

    foundUser = await database.User.findOne({username: username}).exec();

    if(foundUser !== null){

      foundDevcard = await database.Devcard.findOne({ownerId: foundUser._id}).exec();

      userData = {
        username: foundUser.username,
        email: foundUser.email,
        first: foundUser.first,
        last: foundUser.last,
        website: foundUser.website,
        url: foundUser.imageUrl,
        education: foundUser.education,
        workingAt: foundUser.workingAt,
        role: foundUser.role,
        access: foundDevcard.access,
        theme: foundDevcard.theme
      }

      response.valid = true;
      response.userData = userData;

    }

    res.json(response);
});

app.get('/devcardinfo/:username', async function(req, res){

  let username = req.params.username;

  let response = {
    valid: false
  }

  let foundUser = await database.User.findOne({username: username}).exec();

  if(foundUser !== null){

    let devcard = await database.Devcard.findOne({ownerId: foundUser._id}).exec();

    let userData = {
      username: foundUser.username,
      url: foundUser.imageUrl,
      description: devcard.description,
      socials: devcard.socials,
      skills: devcard.skills,
      experiences: devcard.experiences
    }

    response.valid = true;
    response.userData = userData;

  }

  res.json(response);
});


app.get('/devs/:username', async function(req, res){

  let username = req.params.username;
  let id = req.query.accessId;

  let response = {
    valid: false,
    viewingUser: null,
    liked: false
  }

  if(username !== undefined){

    let foundUser = await database.User.findOne({username: username}).exec();

    if(foundUser != null){

      let devcard = await database.Devcard.findOne({ownerId: foundUser._id}).exec();

      let sortedExperiences = devcard.experiences;

      function compareYear(a, b){
        return a.start - b.start
      }

      sortedExperiences = sortedExperiences.sort(compareYear);

      let data = {
        username: username,
        email: foundUser.email,
        first: foundUser.first,
        last: foundUser.last,
        education: foundUser.education,
        workingAt: foundUser.workingAt,
        website: foundUser.website,
        url: foundUser.imageUrl,
        role: foundUser.role,
        experiences: sortedExperiences,

        access: devcard.access,
        theme: devcard.theme,

        description: devcard.description,
        socials: devcard.socials,
        skills: devcard.skills

      }

      response.valid = true;
      response.data = data;

      // Determine if a logged user other than the devcard owner is viewing it
      if(id !== null && id !== undefined){

        viewingUser = await database.User.findOne({username: id}).exec();

        if(viewingUser !== null && viewingUser.username !== foundUser.username){
          response.viewingUser = viewingUser.username
          response.liked = viewingUser.likedIds.includes(foundUser.username)
        }


      }

    }

  }

  res.json(response);

});


////////////////////////////////////////////////////////////////////////////////
// EDIT ENDPOINTS
////////////////////////////////////////////////////////////////////////////////

app.post('/edit/account/:username', async function(req, res){

  let username = req.params.username;

  let email = req.body.email;
  let first = req.body.first;
  let last = req.body.last;
  let website = req.body.website;
  let workingAt = req.body.workingAt;
  let education = req.body.education;
  let role = req.body.role;

  let access = req.body.access;
  let theme = req.body.theme;
  let url = req.body.url;

  let response = {
    valid: false
  }

  let foundUser = await database.User.findOne({username: username}).exec();

  if(foundUser !== null){

    let update = {
      first: first,
      last: last,
      email: email,
      education: education,
      website: website,
      role: role,
      workingAt: workingAt,
      imageUrl: url
    }



    if(email !== foundUser.email){

      otherUser = await database.User.findOne({email: email}).exec();

      if(otherUser === null){

        await foundUser.updateOne(update);
        response.valid = true;

      } else {
        response.error = 'Email is already in use';
      }


    } else {

      await foundUser.updateOne(update);
      response.valid = true;

    }

  }

  // Build new userData
  if(response.valid){

    // Update devcard and get new object
    let devcard = await database.Devcard.findOne({ownerId: foundUser._id}).exec();
    let change = {
      access: access,
      theme: theme
    }

    await devcard.updateOne(change);
    devcard = await database.Devcard.findOne({ownerId: foundUser._id}).exec();


    foundUser = await database.User.findOne({username: username}).exec();

    userData = {
      username: foundUser.username,
      email: foundUser.email,
      first: foundUser.first,
      last: foundUser.last,
      website: foundUser.website,
      url: foundUser.imageUrl,
      education: foundUser.education,
      workingAt: foundUser.workingAt,
      role: foundUser.role,
      access: devcard.access,
      theme: devcard.theme
    }

    response.userData = userData

  }

  res.json(response);
});

app.post('/edit/devcard/:username', async function(req, res){

  let username = req.params.username;

  let description = req.body.description;
  let skills = req.body.skills;
  let socials = req.body.socials;
  let experiences = req.body.experiences

  response =  {
    valid: false
  }

  let foundUser = await database.User.findOne({username: username}).exec();

  if(foundUser !== null){

    let devcard = await database.Devcard.findOne({ownerId: foundUser._id}).exec();

    let changes = {
      description: description,
      skills: skills,
      socials: socials,
      experiences: experiences
    }

    await devcard.updateOne(changes);

    devcard = await database.Devcard.findOne({ownerId: foundUser._id}).exec();

    let userData = {
      username: username,
      description: devcard.description,
      skills: devcard.skills,
      socials: devcard.socials,
      experiences: devcard.experiences
    }

    response.userData = userData;
    response.valid = true;
  }

  res.json(response)
});

app.post('/edit/likes', async function(req, res){

  let likedUsername = req.body.likedUsername;
  let likingUsername = req.body.likingUsername;
  let liked = req.body.liked;

  let response = {
    valid: false
  }

  let foundUser = await database.User.findOne({username: likingUsername}).exec();
  let likedUser = await database.User.findOne({username: likedUsername}).exec();

  let likedCards = foundUser.likedIds;

  let likedCard = await database.Devcard.findOne({ownerId: likedUser._id }).exec();
  let likeCount = likedCard.likes

  if(liked){
    likedCards.push(likedUsername);
    likeCount += 1;

  } else {
    likedCards = likedCards.filter(user => user !== likedUsername)
    likeCount -= 1;
  }

  let changes = {
    likedIds: likedCards
  }

  let cardChanges = {
    likes: likeCount
  }

  await foundUser.updateOne(changes);
  await likedCard.updateOne(cardChanges);

  response.valid = true;

  res.json(response);

});

///////////////////////////////////////////////////////////////////////////////
// SEARCH REQUEST
//////////////////////////////////////////////////////////////////////////////


app.get('/search/devs', async function(req, res){

  let role=req.query.role;

  let skills = req.query.skills;
  if(skills !== undefined)
    skills= skills.split(';')

  let name = req.query.name;
  if(name === undefined)
    name = ""

  console.log(name)

  let users = []
  if(role !== undefined ){
    users = await database.User.find({role: role,
      $or: [
        {first: {$regex: '.*' + name + '.*', $options: 'i'} },
            { last: {$regex: '.*' + name + '.*', $options: 'i'} }
           ]
    }).limit(5).exec();
  }
  else {
    users = await database.User.find({$or: [{first: {$regex: '.*' + name + '.*', $options: 'i'}},
          {last: {$regex: '.*' + name + '.*', $options: 'i'}}
        ]}).limit(5).exec();
  }

  console.log(users)

  let userIds = users.map(user => user._id);

  if(skills !== undefined)
    devcards = await database.Devcard.find({ownerId: {$in: userIds}, skills: {$in: skills}, access: "Public"})
  else
    devcards = await database.Devcard.find({ownerId: {$in: userIds}, access: "Public" });

  console.log('devcards')
  console.log(devcards)

  let cardPreviews = []

  for(const element of devcards){
    let user = await database.User.findById(element.ownerId).exec();

    let preview = await {
      username: user.username,
      role: user.role,
      first: user.first,
      last: user.last,
      url: user.imageUrl,
      theme: element.theme,
      likes: element.likes,
      views: element.views
    }
    await cardPreviews.push(preview);
  }

  console.log('Card previews')
  console.log(cardPreviews)

  let response = {
    cards: cardPreviews
  }

  res.json(response)
});


app.get('/likes/:username', async function(req, res){

  let username = req.params.username;

  let response = {
    valid: false
  }

  let foundUser = await database.User.findOne({username: username}).exec();

  if(foundUser !== null){

    let likedUsernames = foundUser.likedIds;

    let userData = {
      username: foundUser.username,
      url: foundUser.imageUrl
    }

    let users = await database.User.find({username: {$in: likedUsernames}}).exec();

    let devcardPreviews = []

    for(const user of users){
      let devcard = await database.Devcard.findOne({ownerId: user._id}).exec();

      let preview = await {
        username: user.username,
        role: user.role,
        first: user.first,
        last: user.last,
        url: user.imageUrl,
        theme: devcard.theme,
        likes: devcard.likes,
        views: devcard.views
      }

      await devcardPreviews.push(preview)

    }

    response.valid = true;
    response.cards = devcardPreviews;
    response.userData = userData;

  }

  res.json(response);


})





app.listen(3001, function(){
  console.log('Server started')
});
