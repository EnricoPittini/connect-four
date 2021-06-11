import express from 'express';

import auth from '../middlewares/auth'
import player = require('../models/Player');

import {
} from '../httpTypes/requests';
import {
  SuccessResponseBody,
  ErrorResponseBody,
} from '../httpTypes/responses';

const router = express.Router();
export default router;


// /chats
