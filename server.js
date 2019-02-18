'use strict';
const pkg = require('./package.json');
const {URL} = require('url');
const path = require('path');
const fs = require('fs');
//const https = require('https');

const nconf = require('nconf');
nconf
  .argv()
  .env('__')
  .defaults({'NODE_ENV': 'development'});

const NODE_ENV = nconf.get('NODE_ENV');
const isDev = NODE_ENV === 'development';
nconf
  .defaults({'conf': path.join(__dirname, `./config/${NODE_ENV}.config.json`)})
  .file(nconf.get('conf'));

const serviceUrl = new URL(nconf.get('serviceUrl'));

const servicePort =
    serviceUrl.port || (serviceUrl.protocol === 'https:' ? 443 : 80);

const express = require('express');
const morgan = require('morgan');

const app = express();

app.use(morgan('dev'));

app.get('/api/version', (req, res) => res.status(200).json(pkg.version));


const expressSession = require('express-session');

if (isDev) {
  console.log('In development mode.....');
  const FileStore = require('session-file-store')(expressSession);
  app.use(expressSession({
    resave: false,
    saveUninitialized: true,
    secret: 'unguessable',
    store: new FileStore(),
  }));

  const webpack = require('webpack');
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackConfig = require('./webpack.config.js');
  app.use(webpackMiddleware(webpack(webpackConfig), {
    publicPath: '/',
    stats: {colors: true},
  }));
} else {
    console.log('In production mode.....');
    const RedisStore = require('connect-redis')(expressSession);
    app.use(expressSession({
        resave: false,
        saveUninitialized: false,
        secret: nconf.get('redis:secret'),
        store: new RedisStore({
            host: nconf.get('redis:host'),
            port: nconf.get('redis:port'),
        }),
      }));
    app.use(express.static('dist'));
}

const passport = require('passport');
passport.serializeUser((profile, done) => done(null, {
    id: profile.id,
    provider: profile.provider
}));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

const GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.use(new GoogleStrategy({
    clientID: nconf.get('auth:google:appID'),
    clientSecret: nconf.get('auth:google:appSecret'),
    callbackURL: new URL('/auth/google/callback', serviceUrl).href,
    scope: 'https://www.googleapis.com/auth/plus.login',

}, (accessToken, refreshToken, profile, done)=>done(null, profile)));


app.get('/auth/google', passport.authenticate('google', {scope: ['email', 'profile']}));

app.get('/auth/google/callback', passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/'
})); 


app.get('/api/session', (req, res) => { 
    const session = {auth: req.isAuthenticated()};
    res.status(200).json(session);
});

app.get('/api/signout', (req, res) => {
    req.logout();
    res.redirect('/');
});



app.use('/api', require('./lib/bundle.js')(nconf.get('es')));


app.listen(process.env.PORT, () => console.log('Ready.'));