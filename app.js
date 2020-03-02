'use strict';

require('dotenv').config({
  path: __dirname + '/../.env'
});

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const app = express();
var http=require('http').Server(app);
var io = require('socket.io')(http);
var ip = require('ip');


const expressValidator = require('express-validator');
const mongoose = require('mongoose');
const expressSanitizer = require('express-sanitizer');
var expressMongoDb = require('express-mongo-db');
var expressSession = require('express-session');
var User = require('./models/user');

app.use(expressSession({
  secret: '123456',
  resave: true,
  saveUninitialized: true,
  key: 'id',
  cookie: { maxAge: 86400 * 30 } //  24 * 60 * 60 * 1000 (24 hours) // micro seconds
}));
var ssn;

app.use(bodyParser.json()); // for parsing POST req
app.use(bodyParser.urlencoded({
  extended: false
}));
//app.use(expressValidator());
var config = require('./config')
app.use(expressMongoDb(config.database.url));

mongoose.connect('mongodb://localhost:27017/engine', {  useNewUrlParser: true });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
});

app.set('views', __dirname + '/views'); // Render on browser
app.set('view engine', 'ejs');
//app.engine('html', ejs.renderFile);
app.use(express.static(__dirname + '/views'));


const server = app.listen(process.env.PORT || 4000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

const BRAND_NAME = 'Nexmo';
const NEXMO_API_KEY = 'f1cf8c44';
const NEXMO_API_SECRET = '6kspjhDI3fkntjBg';

const Nexmo = require('nexmo');

const nexmo = new Nexmo({
  apiKey: NEXMO_API_KEY,
  apiSecret: NEXMO_API_SECRET
});

// Web UI ("Registration Form")
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});


app.post('/register', (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var phoneNumber = req.body.mobile;
    User.findOne({email:req.body.email},function(err,user){
            if (!user) {
             // res.flash("error", 'Invalid Credential');
                res.redirect('/');
            } else if (!user.validPassword(password)) {
              //req.flash("error", 'Invalid Credential');
                res.redirect('/');
            }else {  
            let phoneNumber = req.body.mobile;
            nexmo.verify.request({
              number: phoneNumber,
              brand: BRAND_NAME
            }, (err, result) => {
              if (err) {
                res.render('status', {
                  message: 'Server Error'
                });
              } else {
                let requestId = result.request_id;
                if (result.status == '0') {
                  res.render('verify', {
                    requestId: requestId
                  });
                } else {
                  res.render('status', {
                    message: result.error_text,
                    requestId: requestId
                  });
                }
              }
            });
            }
        });
});


// SHOW ADD USER FORM
app.get('/add', function(req, res, next){	
	// render to views/user/add.ejs
	res.render('user/add', {
		title: 'Add New User',
		name: '',	
    email: ''		,
    password:'',
    mobile: ''
	})
})

// ADD NEW USER POST ACTION
app.post('/add', function(req, res, next){	
	console.log(req);
		var user = {
      name: req.body.name,
			email: req.body.email,
      password: req.body.password,
      mobile: req.body.mobile,
      address: req.body.address,
      lat: req.body.lat,
      lng: req.body.lng
		}
				 
		req.db.collection('users').insert(user, function(err, result) {
			if (err) {
				// render to views/user/add.ejs
				res.render('/', {
					title: 'Add New User',
          name: user.name,
          email: user.email,
          password: user.password,
          mobile: user.mobile,
          address: user.address,
          lat: req.body.lat,
          lng: req.body.lng
						
				})
			} else {		
				// redirect to user list page				
				res.redirect('/')
			}
		})		
})


app.post('/verify', (req, res) => {
  // Checking to see if the code matches
  let pin = req.body.pin;
  let requestId = req.body.requestId;

  nexmo.verify.check({
    request_id: requestId,
    code: pin
  }, (err, result) => {
    if (err) {
      res.render('status', {
        message: 'Server Error'
      });
    } else {
      if (result && result.status == '0') {
        res.redirect('/dashboard')
      } else {
        res.render('status', {
          message: result.error_text,
          requestId: requestId
        });
      }
    }
  });
});

app.post('/search', (req, res) => {
  // A user registers with a mobile phone number
var searchval;
  var search = req.body.search;
  res.render('users',{searchval:search});
});

app.get('/getresult', (req, res) => {
  // A user registers with a mobile phone number
  
  var search = req.query.search;
    User.find({name: {$regex: search, $options: 'i'}},function(err,result){
          res.send(result);
        });
});