console.info('Server starting...');

import dotenv = require('dotenv');
const result = dotenv.config()                // The dotenv module will load a file named '.env'
// file and load all the key-value pairs into
// process.env (environment variable)
if (result.error) {
  console.error('Unable to load \'.env\' file. Please provide one to store the JWT secret key');
  process.exit(-1);
}
if (!process.env.JWT_SECRET
  || !process.env.DB_HOST
  || !process.env.DB_PORT
  || !process.env.DB_NAME
  || !process.env.MAIN_MODERATOR_USERNAME
  || !process.env.MAIN_MODERATOR_PASSWORD
  || !process.env.SERVER_PORT) {
  console.error('\'.env\' file loaded but doesn\'t contain some required key-value pairs');
  process.exit(-1);
}
if (!process.env.npm_package_version) {
  console.error('Missing environment variabile npm_package_version');
  process.exit(-1);
}

import http = require('http');                    // HTTP module
import mongoose = require('mongoose');
import express = require('express');
import passport = require('passport');            // authentication middleware for Express
import passportHTTP = require('passport-http');   // implements Basic and Digest authentication for HTTP (used for /login endpoint)
import jsonwebtoken = require('jsonwebtoken');    // JWT generation
import jwt = require('express-jwt');              // JWT parsing middleware for express
import cors = require('cors');                    // Enable CORS middleware
import { Server, Socket } from 'socket.io';

import playersRouter from './routes/players';
import friendsRouter from './routes/friends';
import player = require('./models/Player');
import { PlayerType } from './models/Player';

import {
  RegistrationRequestBody,
  StandardPlayerRegistrationRequestBody,
  ModeratorRegistrationRequestBody,
  isStandardPlayerRegistrationRequestBody,
  isModeratorRegistrationRequestBody,
  ConfirmModeratorRequestBody,
  isConfirmModeratorRequestBody,
} from './httpTypes/requests';
import {
  ResponseBody,
  RootResponseBody,
  LoginResponseBody,
  ErrorResponseBody,
  RegistrationResponseBody,
  GetPlayersResponseBody,
  ConfirmModeratorResponseBody,
} from './httpTypes/responses';



declare global {
  namespace Express {
    interface User {
      username: string,
      name: string,
      surname: string,
      type: PlayerType,
    }
  }
}


const app = express();
let io = undefined;


// Configure HTTP basic authentication strategy
passport.use(new passportHTTP.BasicStrategy((username, password, done) => {
    console.info('New login attempt from ' + username);

    player.getModel().findOne({ username: username }).then((player) => {
      if (!player) {
        console.warn('Invalid player username: ' + username);
        const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Invalid player' };
        return (done as Function)(null, false, errorBody);
      }

      if (player.validatePassword(password)) {
        console.info('Player logged in correctly, with username: ' + username);
        return done(null, player);
      }

      console.warn('Invalid password for the username: ' + username);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Invalid password' };
      return (done as Function)(null, false, errorBody);
    })
    .catch(err => {
      console.error('An error occoured during the login validation');
      console.error('Error: ' + JSON.stringify(err, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal error' };
      return done(errorBody);
    })
  }
));

app.use(cors());

// middleware that extracts the entire body portion of an incoming request stream
// and exposes it on req.body
app.use(express.json());


app.use((req, res, next) => {
  console.info('------------------------------------------------')
  console.info(`New request for: ${req.url}`);
  console.info(`Method: ${req.method}`);
  console.info('Query section ' + JSON.stringify(req.query));
  console.info('Body' + JSON.stringify(req.body));
  next();
});

const version = process.env.npm_package_version;

// Add API routes to express application

app.get(`/v${version}`, (_, res) => {
  const body: RootResponseBody = {
    error: false,
    statusCode: 200,
    apiVersion: version,
    endpoints: [
      // TODO
      '/login',
    ]
  };
  res.status(200).json(body);
});



// TODO endpoints

// Login endpoint
app.get(`/v${version}/login`, passport.authenticate('basic', { session: false }), (req, res, next) => {

  // If we reach this point, the user is successfully authenticated and
  // has been injected into req.user

  // We now generate a JWT with the useful user data
  // and return it as response

  if (!req.user) {
    console.error('Internal login error');
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal login error' };
    return next(errorBody);
  }

  const tokenData = {
    username: req.user.username,
    name: req.user.name,
    surname: req.user.surname,
    type: req.user.type,
    // TODO avatar?
  };

  console.info('Login granted. Generating token');
  const tokenSigned = jsonwebtoken.sign(tokenData, process.env.JWT_SECRET as string);

  // Note: You can manually check the JWT content at https://jwt.io

  const body: LoginResponseBody = { error: false, statusCode: 200, token: tokenSigned };
  return res.status(200).json(body);

});

// players endpoint

app.use(`/v${version}/players`, playersRouter);
app.use(`/v${version}/friends`, friendsRouter);



// Add error handling middleware
app.use((err: ErrorResponseBody | jwt.UnauthorizedError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  let errorBody: ErrorResponseBody;
  if (err instanceof jwt.UnauthorizedError) {
    errorBody = { error: true, statusCode: err.status, errorMessage: 'User unauthorized' };
  }
  else {
    errorBody = err;
  }
  console.error('Request error: ' + JSON.stringify(errorBody));
  res.status(errorBody.statusCode || 500).json(errorBody);
});


// The very last middleware will report an error 404
// (will be eventually reached if no error occurred and if
//  the requested endpoint is not matched by any route)
//
app.use((req, res, next) => {
  console.warn('The client requested an invalid endpoint');
  const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'Invalid endpoint' };
  res.status(404).json(errorBody);
});


// Connect to mongodb and launch the HTTP server trough Express

const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  MAIN_MODERATOR_USERNAME,
  MAIN_MODERATOR_PASSWORD,
  SERVER_PORT,
} = process.env;

mongoose.connect(`mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: true,
})
.then(() => {
  console.info('Connected to MongoDB');

  return player.getModel().findOne({ username: MAIN_MODERATOR_USERNAME });
})
.then((playerDocument) => {
  if (!playerDocument) {
    console.info('Creating main moderator');

    return player.newModerator({
      username: MAIN_MODERATOR_USERNAME,
      password: 'temp'
    });
  }
  else {
    console.info('Main moderator already exists');
  }
})
.then((moderatorDocument) => {
  if (moderatorDocument) {
    moderatorDocument.confirmModerator('John', 'Smith', 'TODO', MAIN_MODERATOR_PASSWORD);
    return moderatorDocument.save();
  }
})
.then(() => {
  const server = http.createServer(app);

  io = new Server(server);
  io.on('connection', (socket) => {
    console.info('Socket.io client connected');
  });

  server.listen(SERVER_PORT, () => console.info(`HTTP Server started on port ${SERVER_PORT}`));
})
.catch((err) => {
  console.error('Error Occurred during initialization');
  console.error(err);
});
