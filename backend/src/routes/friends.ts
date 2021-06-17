import express from 'express';

import auth from '../middlewares/auth'
import player = require('../models/Player');

import {
  SuccessResponseBody,
  ErrorResponseBody,
  GetFriendsResponseBody,
} from '../httpTypes/responses';

const router = express.Router();
export default router;


// /friends

//?skip=<skip>&limit=<limit>
router.get(`/`, auth, (req, res, next) => {
  if ((req.query.skip && typeof (req.query.skip) !== 'string') || (req.query.limit && typeof (req.query.limit) !== 'string')) {
    const errorBody = { error: true, statusCode: 405, errorMessage: 'Invalid query section for the URL' };
    return next(errorBody);
  }

  const skip = parseInt(req.query.skip || '0') || 0;
  const limit = parseInt(req.query.limit || '20') || 20;

  player.getModel().findOne({ username: req.user?.username }, { friends: 1 }).then((playerDocument) => {
    if (!playerDocument) {
      console.error('An invalid username asked for his friend list: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      throw errorBody;
    }
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


router.delete(`/:username`, auth, (req, res, next) => {
  Promise.all([ 
    player.getModel().findOne({ username: req.user?.username }, { friends: 1 }).exec(),
    player.getModel().findOne({ username: req.params.username }, { friends: 1 }).exec(),
  ])
  .then( ([myPlayerDocument, otherPlayerDocument]) => {
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
    let success = myPlayerDocument.removeFriend(req.params.username);
    success &&= otherPlayerDocument.removeFriend(req.user!.username);
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
  .then(_ => {
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
