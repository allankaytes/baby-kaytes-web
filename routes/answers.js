var express = require("express");
var router = express.Router({mergeParams: true});
var Game = require("../models/game");
var Answer = require("../models/answer");
var middleware = require("../middleware");

//Answers New
router.get("/new", middleware.isLoggedIn, function(req, res){
    // find game by id
    Game.findById(req.params.id, function(err, game){
        if(err){
            console.log(err);
        } else {
            res.render("answers/new", {game: game});
        }
    })
});

//Answers Create
router.post("/", middleware.isLoggedIn, function(req, res){
    //lookup game using ID 
    Game.findById(req.params.id, function(err, game){
        if(err){
            console.log(err);
            res.redirect("/games");
        } else {
         //create new answer
         Answer.create(req.body.answer, function(err, answer){
            if(err){
                req.flash("error", "Something went wrong");
                console.log(err);
            } else {
                //add username and id to answer 
                answer.author.id = req.user._id;
                answer.author.username = req.user.username;
                //save answer
                answer.save();
                game.answers.push(answer);
                game.save();
                req.flash("success", "Successfully added answer");
                res.redirect('/games/' + game._id);
            }
         });
        }
    });
});

//Answer Edit Route
router.get("/:answer_id/edit", middleware.checkAnswerOwnership, function(req, res){
    Game.findById(req.params.id, function(err, foundGame){
        if(err || !foundGame) {
            req.flash("error", "No game found");
            return res.redirect("back");
        }
        Answer.findById(req.params.answer_id, function(err, foundAnswer){
            if(err){
                res.redirect("back");
            } else {
                res.render("answers/edit", {game_id: req.params.id, answer: foundAnswer});
            }
        });
    });
});

//Answer Update
router.put("/:answer_id", middleware.checkAnswerOwnership, function(req, res){
    Answer.findByIdAndUpdate(req.params.answer_id, req.body.answer, function(err, updatedAnswer){
        if(err){
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated Answer");
            res.redirect("/games/" + req.params.id );
        }
    });
});

// Answer Destroy Route
router.delete("/:answer_id", middleware.checkAnswerOwnership, function(req, res){
    //findBYIdAndRemove
    Answer.findByIdAndRemove(req.params.answer_id, function(err){
        if(err){
            res.redirect("back");
        } else {
            req.flash("success", "Answer deleted");
            res.redirect("/games/" + req.params.id);
        }
    });
});

module.exports = router;