import express from 'express';
import jsonwebtoken = require('jsonwebtoken');    // JWT generation

import auth from '../middlewares/auth'
import player = require('../models/Player');
import { PlayerType } from '../models/Player';
import {
  RegistrationRequestBody,
  StandardPlayerRegistrationRequestBody,
  ModeratorRegistrationRequestBody,
  isStandardPlayerRegistrationRequestBody,
  isModeratorRegistrationRequestBody,
  ConfirmModeratorRequestBody,
  isConfirmModeratorRequestBody,
} from '../httpTypes/requests';
import {
  ResponseBody,
  RootResponseBody,
  LoginResponseBody,
  ErrorResponseBody,
  RegistrationResponseBody,
  GetPlayersResponseBody,
  ConfirmModeratorResponseBody,
} from '../httpTypes/responses';

const router = express.Router();
export default router;

// /players


// players endpoint
router.post(`/`, (req, res, next) => {
  if (isStandardPlayerRegistrationRequestBody(req.body)) {
    // The request body fields are non empty (This is ensured authomatically by the body parsing system)
    player.newStandardPlayer(req.body).then(newPlayer => {
      return newPlayer.save();
    })
    .then(newPlayer => {
      const tokenData = {
        username: newPlayer.username,
        name: newPlayer.name,
        surname: newPlayer.surname,
        type: newPlayer.type,
        // TODO avatar?
      };
      console.info('New standard player correctly created, with username: ' + newPlayer.username);
      const tokenSigned = jsonwebtoken.sign(tokenData, process.env.JWT_SECRET as string);
      const body: RegistrationResponseBody = { error: false, statusCode: 200, token: tokenSigned };
      return res.status(200).json(body);
    })
    .catch(err => {
      if (err.code === 11000) { // Player alredy exists
        console.warn('Standard player already exists, with username: ' + req.body.username);
        const errorBody: ErrorResponseBody = { error: true, statusCode: 409, errorMessage: 'Player already exists' };
        return next(errorBody);
      }
      // Generic DB error
      console.error('Generic DB error during the registration process');
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      return next(errorBody);
    });
  }
  else if (isModeratorRegistrationRequestBody(req.body)) {
    return next();
  }
  else {
    console.warn('Wrong registration body content ' + JSON.stringify(req.body, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong registration body content' };
    return next(errorBody);
  }

}, auth, (req, res, next) => {
  if (req.user?.type !== PlayerType.MODERATOR) {
    console.warn('A non Moderator player asked to create a new Moderator, the player is ' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 403, errorMessage: 'You must be a Moderator to create a new Moderator' };
    return next(errorBody);
  }
  // The request body fields are non empty (This is ensured authomatically by the body parsing system)
  player.newModerator(req.body).then(newModerator => {
    return newModerator.save();
  })
  .then(newModerator => {
    console.info('New moderator player correctly created, with username: ' + newModerator.username);
    const body: ResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  })
  .catch(err => {
    if (err.code === 11000) { // Moderator alredy exists
      console.warn('Moderator already exists, with username: ' + req.body.username);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 409, errorMessage: 'Moderator already exists' };
      return next(errorBody);
    }
    // Generic DB error
    console.error('Generic DB error during the registration process ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  });
});

//?username_filter=<partial_username>&skip=<skip>&limit=<limit>
router.get(`/`, auth, (req, res, next) => {
  const filter: any = {};
  if (req.query.username_filter) {
    filter.username = { $regex: req.query.username_filter, $options: 'i' };
  }

  const fields = {
    _id: 0,     // TODO da testare
    username: 1,
    name: 1,
    surname: 1,
    avatar: 1, // TODO Se è URL
    type: 1,
  };


  console.info('Retrieving players, using filter: ' + JSON.stringify(filter, null, 2));

  if ((req.query.skip && typeof (req.query.skip) != 'string') || (req.query.limit && typeof (req.query.limit) != 'string')) {
    const errorBody = { error: true, statusCode: 405, errorMessage: 'Invalid query section for the URL' };
    return next(errorBody);
  }

  const skip = parseInt(req.query.skip || '0') || 0;
  const limit = parseInt(req.query.limit || '20') || 20;

  player.getModel().find(filter, fields).sort({ timestamp: -1 }).skip(skip).limit(limit).then((documents) => {
    const body: GetPlayersResponseBody = { error: false, statusCode: 200, players: documents };
    return res.status(200).json(body);
  }).catch((err) => {
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});


router.put(`/:username`, auth, (req, res, next) => {
  if (req.user?.type !== PlayerType.MODERATOR_FIRST_ACCESS) {
    console.warn('A non first time Moderator player asked to confirm his account, the player is ' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 403,
      errorMessage: 'You must be a Moderator first access to confirm your account'
    };
    return next(errorBody);
  }

  if (!isConfirmModeratorRequestBody(req.body)) {
    console.warn('Wrong confirm Moderator body content ' + JSON.stringify(req.body, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong confirm Moderator body content' };
    return next(errorBody);
  }

  player.getModel().findOne({ username: req.user.username }).then(moderator => {
    if (!moderator) {
      throw new Error('The first access Moderator was not found, but should have been found');

      // console.error('The first access Moderator was not found, but should have been found');
      // const errorBody : ErrorResponseBody = {error:true, statusCode:500, errorMessage: 'Internal Server error'};
      // return next(errorBody);
    }

    moderator.confirmModerator(req.body.name, req.body.surname, req.body.avatar, req.body.password);
    return moderator.save();
  })
  .then(moderator => {
    console.info('Confirmed Moderator: ' + moderator!.username);
    const tokenData = {
      username: moderator!.username,
      name: moderator!.name,
      surname: moderator!.surname,
      type: moderator!.type,
      // TODO avatar?
    };
    const tokenSigned = jsonwebtoken.sign(tokenData, process.env.JWT_SECRET as string);
    const body: ConfirmModeratorResponseBody = { error: false, statusCode: 200, token: tokenSigned };
    return res.status(200).json(body);
  })
  .catch(err => {
    console.error('An error occoured during the confirmation of the first access moderator ' + req.user?.username);
    console.error(JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  })
});
