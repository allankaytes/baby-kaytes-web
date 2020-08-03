var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Game = require("../models/game");
const { isLoggedIn, isNotVerified } = require('../middleware');
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//root route
router.get("/", function(req, res){
    res.render("landing");
});

// show register form
router.get("/register", function(req, res){
    res.render("register", {page: 'register'}); 
});

//handle sign up logic
router.post("/register", async (req, res) => {
    var newUser = new User({
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            emailToken: crypto.randomBytes(64).toString('hex'),
            isVerified: false,
            avatar: req.body.avatar
        });

    if(req.body.adminCode === process.env.SECRETCODE) {
        newUser.isAdmin = true;
      }

    User.register(newUser, req.body.password, async (err, user) => {
        if(err){
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        // passport.authenticate("local")(req, res, function(){
        //     req.flash("success", "Welcome to YelpCamp " + req.body.username);
        //     res.redirect("/games");
        // });
        const msg = {
          from: 'babykaytes@gmail.com',
          to: user.email, 
          subject: 'BabyKaytes - verify your email',
          text: ` 
          Hello, thank you for registering on babykaytes.com.
          Please copy and paste this address below to verify your email address.
          http://${req.headers.host}/verify-email?token=${user.emailToken}
          Thanks,
          Your Baby Kaytes Care team
          `,
          html: `
          <h1>Hello,</h1>
          <p>Thank you for registering on babykaytes.com.</p>
          <p>Please click the link below to verify your email address.</p>
          <a href="http://${req.headers.host}/verify-email?token=${user.emailToken}">Verify your account</a>
          <p>Thanks,</p>
          <p>Your Baby Kaytes Care team</p>
          `
        }
        try {
          await sgMail.send(msg);
          req.flash('success', 'Thanks for registering. Please check your email to verify your account.');
          res.redirect('/');
        } catch(error) {
          console.log(error);
          req.flash('error', 'Something went wrong.');
          res.redirect('/');
        }
    });
});

// Email verification route
router.get('/verify-email', async(req, res, next) => {
  try {
    const user = await User.findOne({ emailToken: req.query.token });
    if (!user) {
      req.flash('error', 'Token is invalid.');
      return res.redirect('/');
    }
    user.emailToken = null;
    user.isVerified = true;
    await user.save();
    await req.login(user, async (err) => {
      if (err) return next(err);
      req.flash('success', `Welcome to Yelp Camp ${user.username}`);
      const redirectUrl = req.session.redirectTo || '/';
      delete req.session.redirectTo;
      res.redirect(redirectUrl);
    });
  } catch (error) {
    console.log(error);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
});

//show login form
router.get("/login", function(req, res){
    res.render("login", {page: 'login'}); 
});

//handling login logic
router.post("/login", isNotVerified, passport.authenticate("local", 
    {
        successRedirect: "/games",
        failureRedirect: "/login",
        failureFlash: true,
        successFlash: "Welcome to YelpCamp!"
    }), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged you out!");
    res.redirect("/");
});
// forgot password
router.get("/forgot", function(req, res) {
    res.render("forgot");
  });
  
  router.post("/forgot", function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString("hex");
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash("error", "No account with that email address exists.");
            return res.redirect("/forgot");
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: process.env.GMAILUSER,
            pass: process.env.GMAILPW
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'babykaytes@gmail.com',
          subject: 'Password Reset Request',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });
  
  router.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  router.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: process.env.GMAILUSER,
            pass: process.env.GMAILPW
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'babykaytes@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/games');
    });
  });
  
  // USER PROFILE
  router.get("/users/:id", function(req, res) {
    User.findById(req.params.id, function(err, foundUser) {
      if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
      Game.find().where('author.id').equals(foundUser._id).exec(function(err, games) {
        if(err) {
          req.flash("error", "Something went wrong.");
          res.redirect("/");
        }
        res.render("users/show", {user: foundUser, games: games});
      })
    });
  });
  // GET /contact
  router.get("/contact", isLoggedIn, (reg, res) => {
    res.render("contact");
  });
  // POST /contact
  router.post("/contact", async (reg, res) => {
    let { name, email, message } = req.body;
    name = req.sanitize(name);
    email = req.sanitize(email);
    message = req.sanitize(message);
    const msg = {
      to: 'babykaytes@gmail.com',
      from: email, 
      subject: `BabyKaytes Contact Form ${user.firstName}`,
      text: message,
      html: ` 
      <h1>Hi there, this email is from, ${user.firstName} </h1>
      <p>${message}</p>
      `,
    };
    try {
      await sgMail.send(msg);
      req.flash('error', 'Sorry, something went wrong');
      res.redirect('/contact');
    } catch (error) {
      console.error(error);
      if (error.response) {
        console.error(error.response.body)
      }
      req.flash('error', 'Sorry, something went wrong');
      res.redirect('back');
    }
  });

  //show rsvp
  router.get("/rsvp", function(req, res){
    res.render("rsvp", {page: 'rsvp'}); 
  });

module.exports = router;