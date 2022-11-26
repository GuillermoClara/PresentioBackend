const bcrypt = require('bcrypt');



module.exports = {

  async encryptPassword = textPassword =>{
  bcrypt.genSalt(5, (err, salt) => {
    bcrypt.hash(textPassword, salt, function(err, hash){
      if(!err){
        return hash;
      } else {
        return null;
      }

    })
  })
}};
