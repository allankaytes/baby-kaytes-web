var mongoose = require("mongoose");
 
var gameSchema = new mongoose.Schema({
   name: String,
   image: String,
   imageId: String,
   description: String,
   author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User"
      },
      username: String
   },
   answers: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Answer"
      }
   ]
});
 
module.exports = mongoose.model("Game", gameSchema);