import express from 'express';

import auth from '../middlewares/auth'
import player = require('../models/Player');
import friendRequest = require('../models/FriendRequest');

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



// /friend_requests

router.get(`/`, auth, (req, res, next) => {
  const filter = {
    $or: [
      { from: req.user?.username },
      { to: req.user?.username },
    ],
  };

  friendRequest.getModel().find(filter).then((friendRequestDocuments) => {
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

    const otherPlayerDocument = await player.getModel().findOne({ username: req.body.username }).exec();

    if (!otherPlayerDocument) {
      console.warn('A player notified his availability for friend request with an invalid username: ' + req.body.username);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'The specified username doesn\'t exist' };
      throw errorBody;
    }

    const friendRequestDocument = await friendRequest.getModel().findOne({ from: req.body.username, to: req.user!.username }).exec();

    if (!friendRequestDocument) {
      await friendRequest.newFriendRequest({ from: req.user!.username, to: req.body.username }).save();

      const body: NotifyAvailabilityFriendRequestResponseBody = { error: false, statusCode: 200, newFriend: false };
      return res.status(200).json(body);
    }

    const myPlayerDocument = await player.getModel().findOne({ username: req.user!.username }).exec();

    if (!myPlayerDocument) {
      console.error('An invalid username notified his availability for friend request: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      throw errorBody;
    }

    if (myPlayerDocument.hasFriend(otherPlayerDocument.username) || otherPlayerDocument.hasFriend(myPlayerDocument.username)) {
      console.warn('A player notified his availability for friend request but the other player is already his friend, user: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 403, errorMessage: 'The specified username is already your friend' };
      throw errorBody;
    }
    myPlayerDocument.addFriend(otherPlayerDocument.username);
    otherPlayerDocument.addFriend(myPlayerDocument.username);

    await Promise.all([
      myPlayerDocument.save(),
      otherPlayerDocument.save()
    ]);

    await friendRequest.getModel().deleteOne({ from: friendRequestDocument.from, to: friendRequestDocument.to });

    const body: NotifyAvailabilityFriendRequestResponseBody = { error: false, statusCode: 200, newFriend: true };
    return res.status(200).json(body);

    // TODO websocket per notificare
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
