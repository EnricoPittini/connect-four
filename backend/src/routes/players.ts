// PLAYERS ENDPOINTS

import express from 'express';
import jsonwebtoken = require('jsonwebtoken');    // JWT generation

const multer = require("multer");
const path = require("path");
const fs = require("fs");

import auth from '../middlewares/auth'
import player = require('../models/Player');
import { PlayerType,ClientPlayer } from '../models/Player';
import stats = require('../models/Stats');
import chats = require('../models/Chat');
import friendRequest = require('../models/FriendRequest');
import match = require('../models/Match');
import { MatchStatus , MatchDocument } from '../models/Match';
import { FriendMatchRequest } from '../models/FriendMatchRequest';

import { TransientDataHandler } from "../TransientDataHandler";

import { getSocketIO } from '../initializeSocketIO';

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

import {ensureNotFirstAccessModerator} from "../middlewares/ensureNotFirstAccessModerator";

const router = express.Router();
export default router;

// Handler of the non-persistent data
const transientDataHandler = TransientDataHandler.getInstance();


/**
 * Creates a new player (either standard or moderator), given the data in the body of the HTTP request.
 * In addition, returns the JWT token of the new player.
 */
router.post(`/`, (req, res, next) => {

  // Checks if the body contains the standard player registration data
  if (isStandardPlayerRegistrationRequestBody(req.body)) {
    // The request body fields are non empty (This is ensured authomatically by the body parsing system)

    // Creates a new standard player
    player.newStandardPlayer(req.body).then(newPlayer => {
      return newPlayer.save();
    })
    .then(newPlayer => {
      // Creates the JWT
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

  // Checks if the body contains the moderator registration data
  else if (isModeratorRegistrationRequestBody(req.body)) {
    return next(); // Calls the next middleware function (auth middleware)
  }

  // Wrong body content
  else {
    console.warn('Wrong registration body content ' + JSON.stringify(req.body, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong registration body content' };
    return next(errorBody);
  }

  // Next middleware functions (only if the body contains the moderator registration data)
}, auth, ensureNotFirstAccessModerator, (req, res, next) => {
  //Cheks if the Client is a moderator
  if (req.user?.type !== PlayerType.MODERATOR) {
    console.warn('A non Moderator player asked to create a new Moderator, the player is ' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 403, errorMessage: 'You must be a Moderator to create a new Moderator' };
    return next(errorBody);
  }
  // The request body fields are non empty (This is ensured authomatically by the body parsing system)
  // Create a new moderator
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

/**
 * Returns all the players registered in the system
 */
//?username_filter=<partial_username>&skip=<skip>&limit=<limit>
router.get(`/`, auth, ensureNotFirstAccessModerator, (req, res, next) => {

  // Object used to filter the database query
  const filter: any = {};
  if (req.query.username_filter) {
    filter.username = { $regex: req.query.username_filter, $options: 'i' };
  }
  // Object used to select the attributes (Are selected only the usernames)
  const fields = {
    _id: 0,
    username: 1,
  };
  console.info('Retrieving players, using filter: ' + JSON.stringify(filter, null, 2));

  // Parsing skip and limit
  if ((req.query.skip && typeof (req.query.skip) !== 'string') || (req.query.limit && typeof (req.query.limit) !== 'string')) {
    const errorBody = { error: true, statusCode: 405, errorMessage: 'Invalid query section for the URL' };
    return next(errorBody);
  }
  const skip = parseInt(req.query.skip || '0') || 0;
  const limit = parseInt(req.query.limit || '20') || 20;

  // Search the players
  player.getModel().find(filter, fields).sort({ username: 1 }).skip(skip).limit(limit).then((documents) => {
    const playersUsernames = documents.map( document => document.username );
    const body: GetPlayersResponseBody = { error: false, statusCode: 200, playersUsernames: playersUsernames };
    return res.status(200).json(body);
  }).catch((err) => {
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});


/**
 * Used by a first access moderator to confirm his own profile, using the data in the body of the HTTP request.
 * In addition returns the new JWT of the confirmed moderator.
 */
router.put(`/:username`, auth, (req, res, next) => {

  // Cheks if the Client is a first access moderator
  if (req.user?.type !== PlayerType.MODERATOR_FIRST_ACCESS) {
    console.warn('A non first time Moderator player asked to confirm his account, the player is ' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 403,
      errorMessage: 'You must be a Moderator first access to confirm your account'
    };
    return next(errorBody);
  }

  // Cheks if the usernames are the same
  if (req.params.username !== req.user.username) {
    console.warn('A first access Moderator asked to confirm another first access moderator profile' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 403,
      errorMessage: 'Cannot confirm another first access moderator profile'
    };
    return next(errorBody);
  }

  // Cheks if the body is correct
  if (!isConfirmModeratorRequestBody(req.body)) {
    console.warn('Wrong confirm Moderator body content ' + JSON.stringify(req.body, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong confirm Moderator body content' };
    return next(errorBody);
  }

  // Search the moderator document
  player.getModel().findOne({ username: req.user.username }).then(moderator => {
    if (!moderator) {
      throw new Error('The first access Moderator was not found, but should have been found');

      // console.error('The first access Moderator was not found, but should have been found');
      // const errorBody : ErrorResponseBody = {error:true, statusCode:500, errorMessage: 'Internal Server error'};
      // return next(errorBody);
    }

    // Confirm the first access moderator profile
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

    // Create the JWT.
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


/**
 * Returns the data of the player with the specified username
 */
router.get(`/:username`, auth, ensureNotFirstAccessModerator, (req, res, next) => {

  // Fields to select
  const fields = {
    _id: 0,
    username: 1,
    name: 1,
    surname: 1,
    avatar: 1, // TODO Se è URL
    type: 1,
  };

  // Search the player document
  player.getModel().findOne({ username: req.params.username }, fields).then((document) => {
    if (!document) {
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected player doesn\'t exist' };
      throw errorBody;
    }

    // Add the information about online and ingame
    const player: ClientPlayer & {online: boolean, ingame: boolean} = {
      username: document.username,
      name: document.name,
      surname: document.surname,
      avatar: document.avatar,
      type: document.type,
      online: transientDataHandler.isOnline(req.params.username),
      ingame: transientDataHandler.isInGame(req.params.username),
    };
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

/**
 * Used by a Client to get match request informations with respect to the specified player.
 * The client must be a friend of the specified player. (It' a friend match request)
 */
router.get(`/:username/match_request`, auth, ensureNotFirstAccessModerator, (req, res, next) => {

  // Search the document of the specified player
  player.getModel().findOne({ username: req.params.username }).then((playerDocument) => {
    if (!playerDocument) {
      console.warn('A client asked for a non existing player: ' + req.params.username);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected player doesn\'t exist' };
      throw errorBody;
    }

    // Checks if Client is a friend of the specified player.
    if(!playerDocument.hasFriend(req.user!.username)){
      console.warn('A client asked for match request informations for a player that isn\'t his friend');
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'The selected player isn\'t your friend' };
      throw errorBody;
    }

    // Search a friend match request between the two players
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


/**
 * Deletes the specified player.
 */
router.delete(`/:username`, auth, ensureNotFirstAccessModerator, async (req, res, next) => {

  // The socketIO instance
  const io = getSocketIO();

  // Username of the Client
  const myUsername = req.user!.username;
  // Specified username (player to delete)
  const otherUsername = req.params.username;

  // The Client can delete the specified player only if this is his own profile or if he is a moderator
  if (otherUsername !== myUsername && req.user?.type !== PlayerType.MODERATOR) {
    console.warn('A non moderator is trying to delete another player profile, user: ' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 403,
      errorMessage: 'You must be a moderator to delete another player profile',
    };
    return next(errorBody);
  }

  // The Client is deleting his own profile or he is a moderator

  try{
    // Search the document of the specified player
    const otherPlayerDocument = await player.getModel().findOne({ username: otherUsername }).exec();
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

    // Now several operations have to be done before the profile deletion

    // Delete all the friend requests related to the specified player
    await friendRequest.getModel().deleteMany({ $or: [{ from: otherUsername }, { to: otherUsername }] }).exec();

    // Delete the specified player from the friend list of his past friends
    for (let friend of otherPlayerDocument.friends) {
      const friendDocument =  await player.getModel().findOne({ username: friend }).exec();
      friendDocument?.removeFriend(otherUsername);
      await friendDocument?.save();

      // Notify the past friends
      const friendSockets = transientDataHandler.getPlayerSockets(friend);
      for (let friendSocket of friendSockets) {
        friendSocket.emit('lostFriend', otherUsername);
      }
    }

    // Notify all the match requests opponents associated with that player (both senders and receivers)
    const friendMatchRequestsOpponents = transientDataHandler.getPlayerFriendMatchRequestsOpponents(otherUsername);
    for(let opponent of friendMatchRequestsOpponents){
      const opponentSockets = transientDataHandler.getPlayerSockets(opponent);
      for(let opponentSocket of opponentSockets){
        opponentSocket.emit('deleteFriendMatchRequest', {
          sender: otherUsername,
          receiver: opponent
        });
      }
    }
    // Remove all the match requests associated with that player
    transientDataHandler.deletePlayerFriendMatchRequests(otherUsername);

    // Remove the (potential) random match request
    if(transientDataHandler.hasRandomMatchReuqest(otherUsername)){
      transientDataHandler.deleteRandomMatchRequests(otherUsername);
    }

    // Authomatic forfait of the player in all the matches in which he is playing (In theory either one or zero)
    const filter = {
      $or:[
        {
          player1: otherUsername,
          status: MatchStatus.IN_PROGRESS
        },
        {
          player2: otherUsername,
          status: MatchStatus.IN_PROGRESS
        }
      ]
    }
    // The matches that the player was playing (In theory either one or zero). Authomatic forfait for all these matches
    const matchDocuments = await match.getModel().find(filter).exec();
    const promises : Promise<MatchDocument>[] = [];
    for(let matchDocument of matchDocuments){
      matchDocument.forfait(otherUsername);
      promises.push(matchDocument.save());
    }
    await Promise.all(promises);

    // Ending all these matches
    for(let matchDocument of matchDocuments){
      // Notify the opponent of the match (all his sockets)
      const opponent = matchDocument.player1===otherUsername ? matchDocument.player2 : matchDocument.player1;
      const opponentSockets = transientDataHandler.getPlayerSockets(opponent);
      for(let opponentSocket of opponentSockets){
        opponentSocket.emit('match', matchDocument._id.toString());
      }

      // Put the opponent of the match as out of game
      transientDataHandler.markOffGame(opponent);

      // Notify all the observers of the match
      const roomName = 'observersRoom:' + matchDocument._id.toString();
      io.to(roomName).emit('match', matchDocument._id.toString()); // TODO : cosa succede se la room non esiste? (Non dovrebbe fare nulla)

      // All the observers of the match have to leave the match room
      const observersSocketsId = io.sockets.adapter.rooms.get(roomName);
      if(observersSocketsId){ // The match observers room exists
        observersSocketsId.forEach( socketId => {
          const observerSocket = io.sockets.sockets.get(socketId);
          observerSocket?.leave(roomName);
        } );
      }

      // Find the stats documents of the opponent of the match, in order to refresh it
      const statsDocumentPlayer1 = await stats.getModel().findOne({player:matchDocument.player1}).exec();
      const statsDocumentPlayer2 = await stats.getModel().findOne({player:matchDocument.player2}).exec();
      if(!statsDocumentPlayer1 || !statsDocumentPlayer2){
        console.warn('At least one of the player of the match doesn\'t have an associated stats document');
        return;
      }
      await statsDocumentPlayer1.refresh(matchDocument);
      await statsDocumentPlayer2.refresh(matchDocument);
      await statsDocumentPlayer1.save();
      await statsDocumentPlayer2.save();
    }

    // Put the player as out of the game
    transientDataHandler.markOffGame(otherUsername);

    // Delete the stats document of the player
    await stats.getModel().deleteOne({player:otherUsername}).exec();

    // Delete all the chats of the player
    await chats.getModel().deleteMany({$or: [{playerA:otherUsername},{playerB:otherUsername}]} ).exec();

    // Notify all the sockets of the player
    const otherPlayerSockets = transientDataHandler.getPlayerSockets(otherUsername);
    for(let otherPlayerSocket of otherPlayerSockets){
      otherPlayerSocket.emit('profileDeleted');
    }

    // Finally delete the player
    await player.getModel().deleteOne({ username: otherUsername }).exec();

    console.info('Player profile deleted, ' + otherUsername);
    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  }
  catch(err){
    if (err.statusCode) {         // we assume this means it is an ErrorResponseBody
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  }
});


/**
 * Return the stats information about the specified player
 */
router.get(`/:username/stats`, auth, ensureNotFirstAccessModerator, (req, res, next) => {
  //ensureNotFirstAccessModerator(req.user, next);

  // Search the specified player document
  player.getModel().findOne({ username: req.params.username }).then(document => {
    if (!document) {
      console.warn('Client asked the stats of a non existing player');
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'Player not found' };
      throw errorBody;
    }

    // Checks if the Client is a moderator or he is asking for his own stats or for the stats of a friend of him
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

    // The Client is a  moderator or he is asking his own stats or the stats of a friend of him

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



const upload = multer({
  dest: "/temp"
  // you might also want to set some limits: https://github.com/expressjs/multer#limits
});


router.post(`/:username/avatar`, upload.single("file" /* name attribute of <file> element in your form */),
  (req, res, next) => {
    console.log('Uploag file');
    console.log(JSON.stringify(req.file));
    if(!req.file){
      // TODO errore
      return next({});
    }

    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, "./uploads/image.png");

    if(req.headers['content-type']!=="image/jpg"){
      // ERRORE
    }

    
  }
);