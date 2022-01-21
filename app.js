require('dotenv').config();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const express = require("express");
const ejs = require("ejs")
const mongoose = require("mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const _ = require('lodash');
const moment = require("moment");
require('https').globalAgent.options.rejectUnauthorized = false;
const mongoStore = require("connect-mongo");
// const MongoStore = require("mongo-store");

///////   Dependency requirements above    ///////

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({extended : true}));
app.set('view engine', 'ejs')

app.use(session({
  secret : process.env.SECRET,
  resave : false,
  saveUninitialized : false,
  store: mongoStore.create({
    mongoUrl: process.env.PASS
  })
}));

app.use(passport.initialize()); 
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/QSeries", {useNewUrlParser: true,useUnifiedTopology: true,});
// mongoose.connect(String(process.env.PASS),{ useNewUrlParser: true , useUnifiedTopology: true});
// mongoose.set('useCreateIndex', true);


/////////       Schema Creation       //////////
const userSchema = new mongoose.Schema({
    username :{type:String, unique :true},
    name : String,
    pic : String,
    email : String,
    registration : {
      event_name : {
        type:String,
        default:""
      },
      ticked : {
        type : [String],
        default : []
      },
      score : {
        type : Number,
        default : 0,
      },
    }
});

const questionSchema = new mongoose.Schema({
    question: String,
    option_a : String,  
    option_b : String,  
    option_c : String,  
    option_d : String,  
    ans : String,  
});

const eventSchema = new mongoose.Schema({
    event_name : String,
    event_description: String,
    // date : Date,
    startDate : Date,
    endDate : Date,
    event_banner : String,
    questions : [questionSchema],
});


userSchema.plugin(passportLocalMongoose,{
  usernameField : "username"
});
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);
const Question = mongoose.model("question", questionSchema);
const Event = mongoose.model("event", eventSchema);

passport.use(User.createStrategy())

////////  Creating sessions and serializing   //////////
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

////////Google OAuth 2.0 Strategy/////////
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    // callbackURL: "https://mac-markos.herokuapp.com/auth/google/QSeries",
    callbackURL: "http://localhost:3000/auth/google/QSeries",
    userProfileUrl : "https://www.googleapis.com.oauth2.v3.userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ username: profile.id},
        {
            name : profile._json.name,
            pic : profile._json.picture,
            email: profile._json.email
        }, 
        function (err, user) {
        console.log(profile.displayName);
      return cb(err, user);
    });
  }
));

////////////////////////////////////////////////
//////            Get Routes         //////////
////////////////////////////////////////////////
app.get('/', function(req,res){
  res.render('home');
});

app.get('/favicon.ico', function(req,res){
  res.redirect('/');
});

//////        Google Authentication       /////////
app.get('/auth/google', passport.authenticate('google', {
  scope : ['profile','email']
}));

app.get('/auth/google/QSeries', 
passport.authenticate('google', { failureRedirect: '/' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/account');
});

app.get('/account', function(req,res){
  
  if(req.isAuthenticated()){
    const name = req.user.name;
    for(var i = 0; i<name.length; i++){
      if(name[i] === " "){
        break;
      }
    };
    var studentName = _.upperFirst(name.substr(0,i));


    Event.find({}, function(err,found){
      if(err){
        console.log(err);
      }
      else{
        if(req.user.email === "b20163@students.iitmandi.ac.in"){
          res.render("admin", {name:studentName, user:req.user, event:found});
        }
        else{
          res.render("account", {name:studentName, user:req.user, event:found});
        }
      }
    })
  }
})
app.get('/timer/:paramID', function(req,res){
  const event_name = req.params.paramID;
  Event.findOne({event_name : event_name}, function(err,event){
    if(err){
      console.log(err);
    }
    else{
      res.json({startDate:event.startDate, endDate:event.endDate});
    }
  })
})
////////////////////////////////////////////////
///////       Post Methods        //////////
////////////////////////////////////////////////

// Add event
app.post('/addevent',function(req,res){
  const newEvent = new Event({
    event_name : req.body.event_name,
    event_description: req.body.event_description,
    startDate : req.body.startDate,
    endDate : req.body.endDate,
    event_banner : req.body.link
  })
  newEvent.save(function(err){
    if(err){
      console.log(err);
    }
    else{
      console.log("New Event Added");
    }
  })
  res.redirect('/account');
})

// Delete Event
app.post('/delevent', function(req,res){
  Event.deleteOne({event_name : req.body.event_name}, function(err,res){
    if(err){
      console.log(err);
    }
    else{
      console.log("Event Deleted Successfully");
    }
  })
  User.find({}, function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      foundUser.forEach(function(user){
        user.registration.event_name = "";
        user.registration.ticked = [];
        user.registration.score = 0;
        user.save();
        console.log(user);
      })
    }
  })
  res.redirect('/account');
})

// Register for an event
app.post('/register', function(req,res){
  User.findById(req.user._id, function(err,foundUser){
    if(err){
      console.log(err);
      res.redirect("/account");
    }
    else{
      console.log(req.user._id);
      foundUser.registration.event_name = req.body.event_name;
      foundUser.save();
      res.redirect('/account');
    }
  })
})

// Add Questions to an event
app.post('/addq', function(req,res){
  console.log(req.body);
  Event.findOne({event_name:req.body.event_name}, function(err,event){
    if(err){
      console.log(err);
      res.redirect('/account');
    }
    else{
      const quest = req.body.question;
      const otpA = req.body.optiona;
      const otpB = req.body.optionb;
      const otpC = req.body.optionc;
      const otpD = req.body.optiond;
      const ans = req.body.correct;
      const Q = new Question({
        question : quest,
        option_a : otpA,
        option_b : otpB,
        option_c : otpC,
        option_d : otpD,
        ans : ans
      })
      event.questions.push(Q);
      event.save();
      res.redirect('/account');
    }
  })
})

// Attempt the Quiz
app.post('/start', function(req,res){
  const event_name = req.body.event_name;

  if(req.isAuthenticated()){
    const name = req.user.name;
    for(var i = 0; i<name.length; i++){
      if(name[i] === " "){
        break;
      }
    };
    var studentName = _.upperFirst(name.substr(0,i));

    Event.findOne({event_name : event_name}, function(err,found){
      if(err){
        console.log(err);
        res.redirect('/account');
      }
      else{
        res.render("quiz", {name:studentName, user:req.user, event:found});
      }
    })
  }
});

app.post('/quizsubmit', function(req,res){
  if(req.isAuthenticated()){
    User.findById(req.user._id, function(err,user){
      if(err){
        console.log(err);
        res.redirect('/account');
      }
      else{
        Event.find({}, function(err,found){
          if(err){
            console.log(err);
          }
          else{
            var keys = Object.keys(req.body);
            var score=0;
            var i=0;

            keys.forEach(function(key,index){
              const key_value = `${req.body[key]}`;
              user.registration.ticked.push(key_value);
              if(key_value === found[0].questions[i].ans){
                score++;
              }
              i++;
            })
            user.registration.score=score;
            user.save();
            res.redirect('/account');
          }
        })
      }
    })
  }
})

// Logging out
app.get('/logout', function(req,res){
  req.logout();
  res.redirect('/');
})
app.listen(process.env.PORT || 3000, function(){
  console.log("Server running on port 3000" );
});
