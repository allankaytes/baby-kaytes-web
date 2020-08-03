var Game = require("../models/game");
var Answer = require("../models/answer");
var User = require("../models/user");
var middlewareObj = {};

middlewareObj.checkGameOwnership = function(req, res, next) {
    // is user logged in?
    if(req.isAuthenticated()){
        Game.findById(req.params.id, function(err, foundGame) {
            if(err || !foundGame){
                req.flash("error", "Game not found");
                res.redirect("back");
            } else {
                // does user own the game?
                if(foundGame.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that")
        res.redirect("back");
    }
},

middlewareObj.checkAnswerOwnership = function(req, res, next) {
    // is user logged in?
    if(req.isAuthenticated()){
        Answer.findById(req.params.answer_id, function(err, foundAnswer) {
            if(err || !foundAnswer){
                req.flash("error", "Answer not found");
                res.redirect("back");
            } else {
                // does user own the answer?
                if(foundAnswer.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
},

middlewareObj.isLoggedIn = function(req, res, next) {
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
}

middlewareObj.isNotVerified = async function(req, res, next) {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user.isVerified) {
            return next();
        }
        req.flash('error', 'Your account has not been verified. Please check your email to verify your account');
        return res.redirect('/');
    } catch(error) {
        console.log(error);
        req.flash('error', 'Something went wrong. Please contact us for assistance.');
        res.redirect('/');
    }
}

module.exports = middlewareObj;