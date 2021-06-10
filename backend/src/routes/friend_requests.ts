import express from 'express';

import auth from '../middlewares/auth'
import player = require('../models/Player');
import friendRequest = require('../models/FriendRequest');

import {
  NotifyAvailabilityFriendRequestRequestBody,
  isNotifyAvailabilityFriendRequestRequestBody,
} from '../httpTypes/requests';
import {
  SuccessResponseBody,
  ErrorResponseBody,
  GetFriendRequestsResponseBody,
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


router.post(`/`, auth, (req, res, next) => {
  if (!isNotifyAvailabilityFriendRequestRequestBody(req.body)) {
    console.warn('Wrong notify availability friend request body content ' + JSON.stringify(req.body, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong notify availability friend request body content' };
    return next(errorBody);
  }

  // TODO attenzione, ci sono 2 then innestati (va bene ???)
  player.getModel().findOne({ username: req.body.username }).then(playerDocument => {
    if (!playerDocument) {
      console.warn('A player notified his availability for friend request with an invalid username: ' + req.body.username);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'The specified username doesn\'t exist' };
      throw errorBody;
    }

    return playerDocument;
  })
  .then(firstPlayerDocument => {
    friendRequest.getModel().findOne({ from: req.body.username, to: req.user!.username }).then(friendRequestDocument => {
      if (!friendRequestDocument) {
        return friendRequest.newFriendRequest({ from: req.user!.username, to: req.body.username }).save();
      }

      player.getModel().findOne({ username: req.user!.username }).then(secondPlayerDocument => {
        if (!secondPlayerDocument) {
          // TODO throw excpetion
          throw new Error('TODO');
        }

        let error = false;
        error ||= firstPlayerDocument.addFriend(secondPlayerDocument.username);
        error ||= secondPlayerDocument.addFriend(firstPlayerDocument.username);
        if (error) {
          // ! CASO IN CUI I 2 PLAYER ERANO GIA AMICI
          // TODO throw excpetion
          throw new Error('TODO');
        }

        // TODO delete the friendRequest
        // TODO send the response
      });
    });
  })

  // TODO catch

  // TODO websocket per notificare
});
