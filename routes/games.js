var express = require("express");
var router = express.Router();
var Game = require("../models/game");
var middleware = require("../middleware");
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dklfgsa8z', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//Index - show all games
router.get("/", function(req, res){
    // Search all games by name
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Game.find({name: regex}, function(err, allGames){
            if(err || !allGames.length){
                req.flash('error', 'No games matched your search. Please try again.');
                res.redirect("back");
            } else {
                res.render("games/index",{games: allGames, page: 'games'});
            }
        });
    } else {
        // Get all games from DB
        Game.find({}, function(err, allGames){
            if(err){
                console.log(err);
            } else {
                res.render("games/index",{games:allGames});
            }
        });
    }
});
//CREATE - add new game to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        // add cloudinary url for the image to the game object under image property
        req.body.game.image = result.secure_url;
        // add image's public_id to game object
        req.body.game.imageId = result.public_id;
        // add author to game
        req.body.game.author = {
            id: req.user._id,
            username: req.user.username
        }
        Game.create(req.body.game, function(err, game) {
            if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
            }
            res.redirect('/games/' + game.id);
        });
    });
});

// NEW - show form to create new game
router.get("/new", middleware.isLoggedIn, function(req, res){
            res.render("games/new");
});

//Show - shows more info about one game
router.get("/:id", function(req, res){
    //find the game with provided ID
    Game.findById(req.params.id).populate("answers").exec(function(err, foundGame){
        if(err || !foundGame){
            req.flash("error", "Game not found");
            res.redirect("back");
        } else {
            //render show template with that game
            res.render("games/show", {game: foundGame});
        }
    });
});

// EDIT Game Route
router.get("/:id/edit", middleware.checkGameOwnership, function(req, res){
        Game.findById(req.params.id, function(err, foundGame){
            if(err){
                console.log(err);
            } else {
                //render show template with that game
                res.render("games/edit", {game: foundGame});
            }
        });
    });

// UPDATE Game Route
router.put("/:id", middleware.checkGameOwnership, upload.single('image'), function(req, res){
    //find and update the correct game
    Game.findById(req.params.id, async function(err, game){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else{
            if (req.file) {
                try {
                    await cloudinary.v2.uploader.destroy(game.imageId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    game.imageId = result.public_id;
                    game.image = result.secure_url;
                } catch(err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            game.name = req.body.game.name;
            game.description = req.body.game.description;
            game.save();
           //redirect somewhere(show page)
           req.flash("success","Successfully Updated!");
           res.redirect("/games/" + game._id);
        }
    });
});

// Destroy Game Route
router.delete("/:id", middleware.checkGameOwnership, function(req, res){
    Game.findById(req.params.id, async function(err, game){
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        } 
        try {
            await cloudinary.v2.uploader.destroy(game.imageId);
            game.remove();
            req.flash('success', game.name + ' deleted successfully!');
            res.redirect("/games");
        } catch(err) {
            if(err) {
              req.flash("error", err.message);
              return res.redirect("back");
            }
        }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;