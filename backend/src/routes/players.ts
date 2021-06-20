import express from 'express';
import jsonwebtoken = require('jsonwebtoken');    // JWT generation

import auth from '../middlewares/auth'
import player = require('../models/Player');
import { PlayerType } from '../models/Player';
import stats = require('../models/Stats');
import friendRequest = require('../models/FriendRequest');

import { TransientDataHandler } from "../TransientDataHandler";

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
  SuccessResponseBody,
  RootResponseBody,
  LoginResponseBody,
  ErrorResponseBody,
  RegistrationResponseBody,
  GetPlayersResponseBody,
  ConfirmModeratorResponseBody,
  GetPlayerResponseBody,
  GetPlayerStatsResponseBody,
  GetMatchRequestInformationResponseBody,
} from '../httpTypes/responses';

const router = express.Router();
export default router;

const transientDataHandler = TransientDataHandler.getInstance();


// TODO sportare in cartella middlewares
function ensureNotFirstAccessModerator(user: Express.User | undefined, next: express.NextFunction) {
  if (user!.type === PlayerType.MODERATOR_FIRST_ACCESS) {
    console.warn('A first access moderator tried to perform an unauthorized operation, user: ' + JSON.stringify(user, null, 2));
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 403,
      errorMessage: 'You must confirm your moderator profile first'
    };
    next(errorBody);
  }
}


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
    const body: SuccessResponseBody = { error: false, statusCode: 200 };
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
    _id: 0,
    username: 1,
    name: 1,
    surname: 1,
    avatar: 1, // TODO Se è URL
    type: 1,
  };


  console.info('Retrieving players, using filter: ' + JSON.stringify(filter, null, 2));

  if ((req.query.skip && typeof (req.query.skip) !== 'string') || (req.query.limit && typeof (req.query.limit) !== 'string')) {
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

  if (req.params.username !== req.user.username) {
    console.warn('A first access Moderator asked to confirm another first access moderator profile' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 403,
      errorMessage: 'Cannot confirm another first access moderator profile'
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
  });
});


router.get(`/:username`, auth, (req, res, next) => {
  const fields = {
    _id: 0,
    username: 1,
    name: 1,
    surname: 1,
    avatar: 1, // TODO Se è URL
    type: 1,
  };
  player.getModel().findOne({ username: req.params.username }, fields).then((document) => {
    if (!document) {
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected player doesn\'t exist' };
      throw errorBody;
    }

    const player: any = document;
    player.online = transientDataHandler.isOnline(req.params.username);
    player.playing = transientDataHandler.isInGame(req.params.username);
    const body: GetPlayerResponseBody = { error: false, statusCode: 200, player: player };
    return res.status(200).json(body);
  })
  .catch((err) => {
    if (err.statusCode === 404) {
      console.warn('A client asked for a non existing player: ' + req.params.username);
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});

// Endpoint used by a Client to get match request informations with respect to the specified player
router.get(`/:username/match_request`, auth, (req, res, next) => {
  player.getModel().findOne({ username: req.params.username }).then((playerDocument) => {
    if (!playerDocument) {
      console.warn('A client asked for a non existing player: ' + req.params.username);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected player doesn\'t exist' };
      throw errorBody;
    }

    if(!playerDocument.hasFriend(req.user!.username)){
      console.warn('A client asked for match request informations for a player that isn\'t his friend');
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'The selected player isn\'t your friend' };
      throw errorBody;
    }

    let friendMatchRequest : FriendMatchRequest;
    if(transientDataHandler.hasFriendMatchRequest(req.user!.username, req.params.username)){
      friendMatchRequest = transientDataHandler.getFriendMatchRequest(req.user!.username, req.params.username);
    }
    else if(transientDataHandler.hasFriendMatchRequest(req.user!.username, req.params.username)){
      friendMatchRequest = transientDataHandler.getFriendMatchRequest(req.user!.username, req.params.username);
    }
    else{
      console.warn('A client asked for match request informations, but the match request doesn\'t exists');
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match request doesn\'t exist' };
      throw errorBody;
    }

    const body: GetMatchRequestInformationResponseBody = { 
      error: false, 
      statusCode: 200, 
      from: friendMatchRequest.from,
      to: friendMatchRequest.to,
      datetime: friendMatchRequest.datetime,
     };
    return res.status(200).json(body);
  })
  .catch((err) => {
    if (err.statusCode === 404) {
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});


router.delete(`/:username`, auth, (req, res, next) => {
  const myUsername = req.user!.username;
  const otherUsername = req.params.username;

  if (otherUsername !== myUsername && req.user?.type !== PlayerType.MODERATOR) {
    console.warn('A non moderator is trying to delete another player profile, user: ' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 403,
      errorMessage: 'You must be a moderator to delete another player profile',
    };
    return next(errorBody);
  }
  // you are deleting your own profile or you are a moderator

  player.getModel().findOne({ username: otherUsername }).then(otherPlayerDocument => {
    if (!otherPlayerDocument) {
      console.warn('Client asked to delete a non existing player, user: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'Player not found' };
      throw errorBody;
    }
    else if (otherPlayerDocument.type === PlayerType.MODERATOR && otherUsername != myUsername) {
      console.warn('Client asked to delete a moderator, user: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 403, errorMessage: 'You can\'t delete a moderator' };
      throw errorBody;
    }

    // TODO sistemare eventualmente problema del parallellismo delle operazioni nel DB (fallimento di una operazione e non delle altre)
    const promises: Promise<any>[] = [];

    // Delete all the friend requests related to the specified player
    promises.push(friendRequest.getModel().deleteMany({ $or: [{ from: otherUsername }, { to: otherUsername }] }).exec());

    // Delete the specified player from the friend list of his past friends
    for (let friend of otherPlayerDocument.friends) {
      const promise = player.getModel().findOne({ username: friend }).then(friendDocument => {
        friendDocument?.removeFriend(otherUsername);
        return friendDocument?.save();
      });
      promises.push(promise);

      // Notify the past friends
      const friendSockets = transientDataHandler.getPlayerSockets(friend);
      for (let friendSocket of friendSockets) {
        friendSocket.emit('lostFriend', otherUsername);
      }
    }

    promises.push(player.getModel().deleteOne({ username: otherUsername }).exec());

    return Promise.all(promises);
  })
  .then(_ => {
    console.info('Player profile deleted, ' + otherUsername);
    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  })
  .catch(err => {
    if (err.statusCode) {         // we assume this means it is an ErrorResponseBody
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  });
});

router.get(`/:username/stats`, auth, (req, res, next) => {
  ensureNotFirstAccessModerator(req.user, next);

  player.getModel().findOne({ username: req.params.username }).then(document => {
    if (!document) {
      console.warn('Client asked the stats of a non existing player');
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'Player not found' };
      throw errorBody;
    }
    if (req.user!.type !== PlayerType.MODERATOR
        && req.user?.username !== req.params.username
        && !document.hasFriend(req.user!.username)) {

      console.warn('A standard player asked for the stats of another player that isn\'t his friend, user: ',
                   JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = {
        error: true,
        statusCode: 403,
        errorMessage: 'You can\'t access the stats of another player that isn\'t your friend',
      };
      throw errorBody;
    }

    // you are a moderator or you are asking your own stats or the stats of a friend of your

    return stats.getModel().findOne({ _id: document.stats }, { _id: 0, __v: 0 });
  })
  .then(statsDocument => {
    if (!statsDocument) {
      console.error('The stats for a player doesn\'t exist');
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      throw errorBody;
    }
    const body: GetPlayerStatsResponseBody = { error: false, statusCode: 200, stats: statsDocument };
    res.status(200).json(body);
  })
  .catch(err => {
    if (err.statusCode) {         // we assume this means it is an ErrorResponseBody
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  });
});
