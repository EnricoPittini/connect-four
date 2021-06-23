// FRIENDS ENDPOINTS

import express from 'express';

import auth from '../middlewares/auth'
import player = require('../models/Player');
import {PlayerType} from '../models/Player';
import chats = require('../models/Chat');

import { TransientDataHandler } from "../TransientDataHandler";

import {
  SuccessResponseBody,
  ErrorResponseBody,
  GetFriendsResponseBody,
} from '../httpTypes/responses';

const router = express.Router();
export default router;

// Handler of the non-persistent data
const transientDataHandler = TransientDataHandler.getInstance();

import {ensureNotFirstAccessModerator} from "../middlewares/ensureNotFirstAccessModerator";


/**
 * Returns all the friends of the Client
 */
//?skip=<skip>&limit=<limit>
router.get(`/`, auth, ensureNotFirstAccessModerator, (req, res, next) => {

  // Parse skip and limit
  if ((req.query.skip && typeof (req.query.skip) !== 'string') || (req.query.limit && typeof (req.query.limit) !== 'string')) {
    const errorBody = { error: true, statusCode: 405, errorMessage: 'Invalid query section for the URL' };
    return next(errorBody);
  }
  const skip = parseInt(req.query.skip || '0') || 0;
  const limit = parseInt(req.query.limit || '20') || 20;

  // Search for the player document of the Client
  player.getModel().findOne({ username: req.user?.username }, { friends: 1 }).then((playerDocument) => {
    if (!playerDocument) {
      console.error('An invalid username asked for his friend list: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      throw errorBody;
    }
    // Return the friend list
    const filteredFriends = playerDocument.friends.slice(skip, skip+limit);
    const body: GetFriendsResponseBody = { error: false, statusCode: 200, friends: filteredFriends };
    return res.status(200).json(body);
  }).catch((err) => {
    if (err.statusCode) {         // we assume this means it is an ErrorResponseBody
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  });
});


/**
 * The Client asks to delete a friend of him, with the specified username
 */
router.delete(`/:username`, auth, ensureNotFirstAccessModerator, (req, res, next) => {

  // Username of the Client
  const myUsername = req.user!.username;
  // Specified username (friend to delete)
  const otherUsername = req.params.username;

  // Search the two players documents (both of the Client and of the specified player)
  Promise.all([
    player.getModel().findOne({ username: myUsername }, { friends: 1 }).exec(),
    player.getModel().findOne({ username: otherUsername }, { friends: 1 }).exec(),
  ])
  .then(([myPlayerDocument, otherPlayerDocument]) => {
    if (!myPlayerDocument) {
      console.error('An invalid username asked to delete one of his friend: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      throw errorBody;
    }
    if (!otherPlayerDocument) {
      console.error('A player asked to delete from the list of his friends an invalid username');
      const errorBody: ErrorResponseBody = {
        error: true,
        statusCode: 404,
        errorMessage: 'You asked to delete from the list of your friends an invalid username'
      };
      throw errorBody;
    }

    // Delete the specified username from the friend list of the Client and delete the Client from the friend list
    // of the specified username
    let success = myPlayerDocument.removeFriend(otherUsername);
    success &&= otherPlayerDocument.removeFriend(myUsername);
    if (!success) {
      console.warn('A player is asking to delete a friend that actually isn\'t his friend, user: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The specified player isn\'t your friend' };
      throw errorBody;
    }
    return Promise.all([
      myPlayerDocument.save(),
      otherPlayerDocument.save(),
    ]);
  })
  .then( ([myPlayerDocument, otherPlayerDocument]) =>{
    // Delete the (potential) chat between the two players. Only if both of them aren't moderators
    if(myPlayerDocument.type===PlayerType.MODERATOR || otherPlayerDocument.type===PlayerType.MODERATOR){
      return;
    }
    const filter = {$or:[{playerA:myUsername,playerB:otherUsername},{playerA:otherUsername,playerB:myUsername}]};
    return chats.getModel().deleteOne(filter);
  })
  .then( _ => {
    // Notify the other player
    const otherPlayerSockets = transientDataHandler.getPlayerSockets(otherUsername);
    for (let otherPlayerSocket of otherPlayerSockets) {
      otherPlayerSocket.emit('lostFriend', myUsername);
    }

    // Delete the (potential) match request between the two players
    if(transientDataHandler.hasFriendMatchRequest(myUsername, otherUsername)){
      transientDataHandler.deleteFriendMatchRequest(myUsername, otherUsername);
    }
    else if(transientDataHandler.hasFriendMatchRequest(otherUsername, myUsername)){
      transientDataHandler.deleteFriendMatchRequest(otherUsername, myUsername);
    }
    // Notify the other player (all the sockets)
    for (let otherPlayerSocket of otherPlayerSockets) {
      otherPlayerSocket.emit('deleteFriendMatchRequest',{
        sender: myUsername,
        receiver: otherUsername,
      });
    }
    // Notify the Client (all the sockets)
    const myPlayerSockets = transientDataHandler.getPlayerSockets(myUsername);
    for (let myPlayerSocket of myPlayerSockets) {
      myPlayerSocket.emit('deleteFriendMatchRequest', {
        sender: otherUsername,
        receiver: myUsername,
      });
    }

    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  })
  .catch((err) => {
    if (err.statusCode) {         // we assume this means it is an ErrorResponseBody
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  });
});
