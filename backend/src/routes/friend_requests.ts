import express from 'express';

import auth from '../middlewares/auth'
import player = require('../models/Player');
import friendRequest = require('../models/FriendRequest');

import { TransientDataHandler } from "../TransientDataHandler";

import {
  NotifyAvailabilityFriendRequestRequestBody,
  isNotifyAvailabilityFriendRequestRequestBody,
  NotifyUnavailabilityFriendRequestRequestBody,
  isNotifyUnavailabilityFriendRequestRequestBody,
} from '../httpTypes/requests';
import {
  SuccessResponseBody,
  ErrorResponseBody,
  GetFriendRequestsResponseBody,
  NotifyAvailabilityFriendRequestResponseBody,
} from '../httpTypes/responses';

const router = express.Router();
export default router;

const transientDataHandler = TransientDataHandler.getInstance();

// /friend_requests

router.get(`/`, auth, (req, res, next) => {
  const filter = {
    $or: [
      { from: req.user?.username },
      { to: req.user?.username },
    ],
  };

  friendRequest.getModel().find(filter, { _id: 0, __v: 0 }).then((friendRequestDocuments) => {
    const body: GetFriendRequestsResponseBody = { error: false, statusCode: 200, friendRequests: friendRequestDocuments };
    return res.status(200).json(body);
  }).catch((err) => {
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  });
});


router.post(`/`, auth, async (req, res, next) => {
  try {
    if (!isNotifyAvailabilityFriendRequestRequestBody(req.body)) {
      console.warn('Wrong notify availability friend request body content ' + JSON.stringify(req.body, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong notify availability friend request body content' };
      throw errorBody;
    }

    const myUsername = req.user!.username;
    const otherUsername = req.body.username;

    // Check that the usernames (mine and his) are different
    if(myUsername === otherUsername){
      console.warn('A player notified his availability for friend request to himself');
      const errorBody: ErrorResponseBody = {
        error: true,
        statusCode: 400,
        errorMessage: 'You can\'t notify your availability for friend request to yourself'
      };
      throw errorBody;
    }

    const otherPlayerDocument = await player.getModel().findOne({ username: otherUsername }).exec();

    // Check that the other username is valid
    if (!otherPlayerDocument) {
      console.warn('A player notified his availability for friend request with an invalid username: ' + otherUsername);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'The specified username doesn\'t exist' };
      throw errorBody;
    }

    const myPlayerDocument = await player.getModel().findOne({ username: myUsername }).exec();

    // Check that my username is valid
    if (!myPlayerDocument) {
      console.error('An invalid username notified his availability for friend request: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      throw errorBody;
    }

    // Check that we aren't friends yet
    if (myPlayerDocument.hasFriend(otherPlayerDocument.username) || otherPlayerDocument.hasFriend(myPlayerDocument.username)) {
      console.warn('A player notified his availability for friend request but the other player is already his friend, user: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 403, errorMessage: 'The specified username is already your friend' };
      throw errorBody;
    }

    // We are sure that the 2 usernames (mine and his) are different valid usernames and we are sure that we aren't friends yet

    const friendRequestDocument = await friendRequest.getModel().findOne({ from: otherUsername, to: myUsername }).exec();

    // Check if the other player has alredy made a friend request to me
    if (!friendRequestDocument) {
      // The other player has not made a friend request to me yet
      const myFriendRequestDocument = await friendRequest.getModel().findOne({ from: myUsername, to: otherUsername }).exec();

      // Check that I haven't alredy made a friend request to him
      if(myFriendRequestDocument){
        console.warn('A player notified his availability for friend request but he has alredy done that');
        const errorBody: ErrorResponseBody = {
          error: true,
          statusCode: 400,
          errorMessage: 'You have alredy notified your availability to become friend of this player'
        };
        throw errorBody;
      }

      // We are sure that there are not friend request between us

      // Create new friend request
      await friendRequest.newFriendRequest({ from: myUsername, to: otherUsername }).save();

      // Notify the other player
      const otherPlayerSockets = transientDataHandler.getPlayerSockets(otherUsername);
      for (let otherPlayerSocket of otherPlayerSockets) {
        otherPlayerSocket.emit('newFriendRequest', myUsername);
      }

      const body: NotifyAvailabilityFriendRequestResponseBody = { error: false, statusCode: 200, newFriend: false };
      return res.status(200).json(body);
    }

    // The other player has alredy made a friend request to me : I accept the request

    myPlayerDocument.addFriend(otherPlayerDocument.username);
    otherPlayerDocument.addFriend(myPlayerDocument.username);

    await Promise.all([
      myPlayerDocument.save(),
      otherPlayerDocument.save()
    ]);

    // Deleting the friend request
    await friendRequest.getModel().deleteOne({ from: friendRequestDocument.from, to: friendRequestDocument.to });

    // Notify the other player
    const otherPlayerSockets = transientDataHandler.getPlayerSockets(otherUsername);
    for (let otherPlayerSocket of otherPlayerSockets) {
      otherPlayerSocket.emit('newFriend', myUsername);
    }

    const body: NotifyAvailabilityFriendRequestResponseBody = { error: false, statusCode: 200, newFriend: true };
    return res.status(200).json(body);
  }
  catch (err) {
    if (err.statusCode) {         // we assume this means it is an ErrorResponseBody
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  }
});


router.delete(`/`, auth, async (req, res, next) => {
  try {
    if (!isNotifyUnavailabilityFriendRequestRequestBody(req.body)) {
      console.warn('Wrong notify unavailability friend request body content ' + JSON.stringify(req.body, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong notify unavailability friend request body content' };
      throw errorBody;
    }

    const myUsername = req.user!.username;
    const otherUsername = req.body.username;

    if(myUsername === otherUsername){
      console.warn('A player notified his unavailability for friend request to himself');
      const errorBody: ErrorResponseBody = {
        error: true,
        statusCode: 400,
        errorMessage: 'You can\'t notify your unavailability for friend request to yourself'
      };
      throw errorBody;
    }

    const otherPlayerDocument = await player.getModel().findOne({ username: otherUsername }).exec();

    if (!otherPlayerDocument) {
      console.warn('A player notified his unavailability for friend request with an invalid username: ' + otherUsername);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'The specified username doesn\'t exist' };
      throw errorBody;
    }

    const filter = {
      $or: [
        { from: myUsername, to: otherUsername },
        { from: otherUsername, to: myUsername },
      ],
    };

    // deleteOne would be sufficient, but deleteMany is safer
    const deleteInfo = await friendRequest.getModel().deleteMany(filter).exec();

    if (!deleteInfo.deletedCount || deleteInfo.deletedCount <= 0) {
      console.warn('A player notified his unavailability for friend request but the friend request doesn\'t exist, user: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'A friend request with the specified username doesn\'t exist' };
      throw errorBody;
    }

    // Notify the other player
    const otherPlayerSockets = transientDataHandler.getPlayerSockets(otherUsername);
    for (let otherPlayerSocket of otherPlayerSockets) {
      otherPlayerSocket.emit('cancelFriendRequest', myUsername);
    }

    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  }
  catch (err) {
    if (err.statusCode) {         // we assume this means it is an ErrorResponseBody
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  }
});
