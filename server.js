const express = require("express");
const res = require("express/lib/response");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const { response } = require("express");
require('dotenv').config()

process.env.PWD = process.cwd()

const app = express();

app.use(express.urlencoded({extended: true})) 
app.use(express.static(process.env.PWD + '/public'));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(session({secret : "secret cord", resave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());
app.use("/public", express.static("public"));



const MongoClient = require("mongodb").MongoClient;

var db;
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, function (err, client) {
	if (err) return console.log(err);
	db = client.db('Josting');
	app.listen(process.env.PORT, function () {
		console.log(`listening on ${process.env.PORT}`);
	});
});

app.get("/", function(req, res){
    res.render("index.ejs");
}); 

app.get("/write", function(req, res){
    res.render("write.ejs");
});

app.get("/list", function(req, response){
    db.collection("posts").find().toArray(function(err, res){
        response.render('list.ejs', {posts : res});
    });
});

app.delete("/delete", function(req, res){
    req.body._id = parseInt(req.body._id);
    db.collection("posts").deleteOne(req.body, function(err, result){
        if (err) console.log(err);
        res.status(200).send({ 
            message : "Successfully Deleted"
        });
    });
});

app.get("/detail/:id", function(req, res){
    db.collection("posts").findOne({_id : parseInt(req.params.id)}, function(err, result){
        res.render("detail.ejs", {data : result});
    });
})

app.post("/add", function(req, res){
    res.send("Success");
    db.collection("counter").findOne({name : 'Total Posts'}, function(err, res){
        var totalPosts = res.totalPosts;
        db.collection("posts").insertOne({ _id  : totalPosts + 1, title : req.body.title, text : req.body.text}, function(err, res){
            // $set : {totalPosts : totalPosts + 1} == $inc : {totalPosts : 1}
            db.collection('counter').updateOne({name : 'Total Posts'},{$set : {totalPosts : totalPosts + 1}} , function(err, res){
                if(err){return res.send(err)}
            });
        });        
    });
});



app.get("/edit/:id", function(req, res){
    db.collection("posts").findOne({_id : parseInt(req.params.id)}, function(err, result){
        res.render("edit.ejs", { data : result});
    });
});

app.put("/edit/:id", function(req, res){
    db.collection("posts").updateOne({_id : parseInt(req.params.id)}, {$set : { title : req.body.title, text : req.body.text}, function(err, result){
     if (err){return res.send(err)}
    }}); 
    res.redirect("/list");
 });

 app.get("/login", function(req, res){
    res.render("login.ejs");
});

app.post("/login", passport.authenticate("local", {
    failureRedirect : "/fail"
}), function(req, res){
    res.redirect("/");
});

app.get("/fail", function(req, res){
   res.redirect("/"); 
});

function is_login(req, res, next){
    // console.log(req);
    if (req.user){
        next();
    }
    else {
        res.send("Not loginned");
    }
};

app.get("/mypage", is_login, function(req, res){
    console.log(req.user);
    res.render("mypage.ejs", {user : req.user});
});

app.get("/search", function(req, res){
    console.log(req.query.value);
    db.collection("posts").find({ $text: { $search : req.query.value } } ).toArray(function(err, result){
        res.render("search.ejs", {posts: result});
    });
});


// Login Session manager
passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  }, function (user_id, user_pw, done) {
    //console.log(user_id, user_pw);
    db.collection('login').findOne({ id: user_id }, function (err, res) {
      if (err) return done(err)
  
      if (!res) return done(null, false, { message: 'Not exist ID' })
      if (user_pw == res.pw) {
        return done(null, res)
      } else {
        return done(null, false, { message: 'Wrong Password' })
      }
    })
  }));


passport.serializeUser(function(user, done){
  done(null, user.id);
});
passport.deserializeUser(function(user_id, done){
    db.collection("login").findOne({id : user_id}, function(err, res){
        done(null, res);
    });
});