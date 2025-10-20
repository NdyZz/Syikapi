__path = process.cwd()
require('dotenv').config()
require("./settings");
var express = require('express'),
    cors = require('cors'),
    flash = require('connect-flash'),
    rateLimit = require("express-rate-limit"),
    passport = require('passport'),
    expressLayout = require('express-ejs-layouts'),
    compression = require('compression'),
    session = require('express-session'),
    cookieParser = require('cookie-parser'),
    MemoryStore = require('memorystore')(session),
    secure = require('ssl-express-www'),
    cors = require ("cors"),
    schedule = require('node-schedule');
    
const PORT = process.env.PORT || 3000
var app = express()
var { color } = require('./lib/color.js')

const { isAuthenticated } = require('./lib/auth');
const { connectMongoDb } = require('./MongoDB/mongodb');
const { resetAllLimit, getApikey, updateHit, getVisitor } = require('./MongoDB/function');
var apirouter = require('./routes/api'),
    mainrouter = require('./routes/main'),
    userrouter = require('./routes/users');
connectMongoDb();
app.set('trust proxy', 1);
app.use(compression());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 2000, 
  message: 'Oops too many requests'
});
app.use(limiter);

app.set('view engine', 'ejs');
app.set('views', __path.join(__dirname, 'views'));
app.use(expressLayout);
app.use(express.static("assets"))

app.enable('trust proxy');
app.set("json spaces",2)
app.use(cors())
app.use(secure)

app.use(session({
  secret: 'secret',  
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({
    checkPeriod: 86400000
  }),
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(passport.initialize());
app.use(passport.session());
require('./lib/config')(passport);

app.use(flash());

app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
})

app.get('/', (req, res) => {
    res.render('home', {
    layout: 'home'
  });
})
app.get('/docs', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username, limit} = getkey
  const {hit} = await getVisitor();
  res.render('index', {
    updateHit,
    hit,
    apikey,
    username,
    limit,
    layout: 'index'
  });
})

app.get('/ai', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'ai',
    restapi: global.restapi.ai,
    layout: 'viewsapi'
  });
})
app.get('/cecan', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'cecan',
    restapi: global.restapi.cecan,
    layout: 'viewsapi'
  });
})
app.get('/cogan', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'cogan',
    restapi: global.restapi.cogan,
    layout: 'viewsapi'
  });
})
app.get('/downloader', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'downloader',
    restapi: global.restapi.dl,
    layout: 'viewsapi'
  });
})
app.get('/search', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'search',
    restapi: global.restapi.search,
    layout: 'viewsapi'
  });
})
app.get('/islam', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'islamic',
    restapi: global.restapi.islamic,
    layout: 'viewsapi'
  });
})
app.get('/game', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'game',
    restapi: global.restapi.game,
    layout: 'viewsapi'
  });
})
app.get('/tool', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'tool',
    restapi: global.restapi.tool,
    layout: 'viewsapi'
  });
})
app.get('/other', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'other',
    restapi: global.restapi.other,
    layout: 'viewsapi'
  });
})
app.get('/anime', isAuthenticated, async(req, res) => {
  let getkey = await getApikey(req.user.id)
  let { apikey, username } = getkey
  res.render('viewsapi', {
    apikey,
    page: 'anime',
    restapi: global.restapi.anime,
    layout: 'viewsapi'
  });
})

app.use('/api', apirouter)
app.use('/users', userrouter)

app.use(function (req, res, next) {
    res.status(404).render('404err', {
        layout: "404err"
    })
})

app.listen(PORT, () => {
    console.log(color("Server running on port " + PORT,'green'))
    schedule.scheduleJob('* * * * *', () => { 
    resetAllLimit()
})
})

module.exports = app
