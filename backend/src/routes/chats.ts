import express from 'express';

import auth from '../middlewares/auth'
import chat = require('../models/Chat');

import {
} from '../httpTypes/requests';
import {
  SuccessResponseBody,
  ErrorResponseBody,
  GetChatsResponseBody,
  GetChatResponseBody,
} from '../httpTypes/responses';

const router = express.Router();
export default router;


// /chats
router.get(`/`, auth, (req, res, next) => {
  const filter = {$or: [{playerA: req.user?.username}, {playerB: req.user?.username}]};
  chat.getModel().find(filter, {_id:0,__v:0,messages:0}).then((chatDocuments) => {
    const body: GetChatsResponseBody = { error: false, statusCode: 200, chats: chatDocuments };
    return res.status(200).json(body);
  }).catch((err) => {
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
    return next(errorBody);
  });
});


router.get(`/:username`, auth, (req, res, next) => {
  const myUsername = req.user?.username;
  const otherUsername = req.params.username;
  const filter = {
    $or: [
      { playerA: myUsername, playerB: otherUsername },
      { playerA: otherUsername, playerB: myUsername },
    ]
  };
  chat.getModel().findOne(filter, {_id:0,__v:0}).then((chatDocument) => {
    if(!chatDocument){
      console.warn('A player asked for a non existing chat, user: ' + JSON.stringify(req.user, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The requested chat doesn\'t exist' };
      throw errorBody;    
    }
    const body: GetChatResponseBody = { error: false, statusCode: 200, chat: chatDocument };
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


// TODO valutare POST /:username