import http = require('http');                    // HTTP module
import mongoose = require('mongoose');
import express = require('express');
import passport = require('passport');            // authentication middleware for Express
import passportHTTP = require('passport-http');   // implements Basic and Digest authentication for HTTP (used for /login endpoint)
import jsonwebtoken = require('jsonwebtoken');    // JWT generation
import jwt = require('express-jwt');              // JWT parsing middleware for express
import cors = require('cors');                    // Enable CORS middleware
import { Server, Socket } from 'socket.io';
import dotenv = require('dotenv');

import player = require('./models/Player');


console.info('Server starting...');

const result = dotenv.config()                // The dotenv module will load a file named ".env"
                                              // file and load all the key-value pairs into
                                              // process.env (environment variable)
if (result.error) {
  console.error("Unable to load \".env\" file. Please provide one to store the JWT secret key");
  process.exit(-1);
}
if (!process.env.JWT_SECRET
    || !process.env.DB_HOST
    || !process.env.DB_PORT
    || !process.env.DB_NAME
    || !process.env.MAIN_MODERATOR_USERNAME
    || !process.env.MAIN_MODERATOR_PASSWORD
    || !process.env.SERVER_PORT) {
  console.error("\".env\" file loaded but doesn't contain some required key-value pairs");
  process.exit(-1);
}


// declare global {
//   namespace Express {
//     interface User {
//       mail: string,
//       username: string,
//       roles: string[],
//       id: string
//     }
//   }
// }


const app = express();
let io = undefined;

// We create the JWT authentication middleware
// provided by the express-jwt library.
//
// How it works (from the official documentation):
// If the token is valid, req.user will be set with the JSON object
// decoded to be used by later middleware for authorization and access control.
//
var auth = jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
});

app.use(cors());

// middleware that extracts the entire body portion of an incoming request stream
// and exposes it on req.body
app.use(express.json());


app.use((req, res, next) => {
  console.info("------------------------------------------------")
  console.info("New request for: " + req.url);
  console.info("Method: " + req.method);
  next();
})

// Add API routes to express application

app.get("/", (_, res) => {
  res.status(200).json({
    api_version: "0.0.1",
    endpoints: [
      // TODO
      "/messages",
      "/tags",
    ]
  });
});



// TODO endpoints




// Add error handling middleware
app.use((err: any /* TODO aggiustare tipo */, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Request error: " + JSON.stringify(err));
  res.status(err.statusCode || 500).json(err);
});


// The very last middleware will report an error 404
// (will be eventually reached if no error occurred and if
//  the requested endpoint is not matched by any route)
//
app.use((req, res, next) => {
  console.warn('The client requested an invalid endpoint');
  res.status(404).json({
    statusCode: 404,
    error: true,
    errorMessage: "Invalid endpoint"
  });
})


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
  console.info("Connected to MongoDB");

  return player.getModel().findOne({ username: MAIN_MODERATOR_USERNAME });
})
.then((playerDocument) => {
  if (!playerDocument) {
    console.info("Creating main moderator");

    return player.newModerator({
      username: MAIN_MODERATOR_USERNAME,
      password: 'temp'
    });
  }
  else {
    console.info("Main moderator already exists");
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
    console.info("Socket.io client connected");
  });

  server.listen(SERVER_PORT, () => console.info(`HTTP Server started on port ${SERVER_PORT}`));
})
.catch((err) => {
  console.error("Error Occurred during initialization");
  console.error(err);
});
