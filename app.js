require('dotenv').config();
const express      = require("express");
const app            = express();
const bodyParser     = require("body-parser");
const mongoose       = require("mongoose");
const flash          = require("connect-flash");
const passport       = require("passport");
const LocalStrategy  = require("passport-local");
const methodOverride = require("method-override");
const Game           = require("./models/game");
const Answer        = require("./models/answer");
const User           = require("./models/user");
const session        = require("express-session");
// const seedDB         = require("./seeds");
const expressSanitizer = require('express-sanitizer');

//requring routes   
const answerRoutes    = require("./routes/answers");
const gameRoutes = require("./routes/games");
const indexRoutes      = require("./routes/index");

const url = process.env.DATABASEURL || "mongodb://localhost:27017/baby_kaytes";
mongoose.connect(url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
});

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
//app.use(cookieParser("secret"));
// require moment
app.locals.moment = require("moment");
app.use(flash());
// Mount express-sanitizer middleware here
app.use(expressSanitizer());
// seedDB(); //seed the database

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "I love my kids",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

app.use("/", indexRoutes);
app.use("/games", gameRoutes);
app.use("/games/:id/answers", answerRoutes);

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server Has Started!");
});