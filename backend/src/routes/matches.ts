import express from 'express';
import mongoose = require('mongoose');

import auth from '../middlewares/auth'
import match = require('../models/Match');
import { MatchStatus } from '../models/Match';
import stats = require('../models/Stats');
import { StatsDocument } from '../models/Stats';

import { getSocketIO } from '../initializeSocketIO';

import {
  AddMoveRequestBody,
  isAddMoveRequestBody,
} from '../httpTypes/requests';
import {
  SuccessResponseBody,
  ErrorResponseBody,
  GetMatchesResponseBody,
  GetMatchResponseBody,
} from '../httpTypes/responses';
import { TransientDataHandler } from '../TransientDataHandler';

const transientDataHandler = TransientDataHandler.getInstance();

const router = express.Router();
export default router;

// TODO eventualmente restituire solo lista id di matches e non tutti i dati
router.get(`/`, auth, async (req, res, next) => {
  if ((req.query.skip && typeof (req.query.skip) !== 'string') || (req.query.limit && typeof (req.query.limit) !== 'string')
      || (req.query.live && typeof (req.query.live) !== 'string') || (req.query.username && typeof (req.query.username) !== 'string')) {
    const errorBody = { error: true, statusCode: 405, errorMessage: 'Invalid query section for the URL' };
    return next(errorBody);
  }

  let live = false;
  if (req.query.live) {
    if (req.query.live.toLowerCase() !== "true" || req.query.live.toLowerCase() !== "false") {
      live = req.query.live.toLowerCase() !== "true" ? true : false;
    }
    else {
      const errorBody = { error: true, statusCode: 405, errorMessage: 'Invalid query section for the URL' };
      return next(errorBody);
    }
  }

  const skip = parseInt(req.query.skip || '0') || 0;
  const limit = parseInt(req.query.limit || '20') || 20;

  const username = req.query.username;

  const filter: any = {};
  if (live) {
    filter.status = MatchStatus.IN_PROGRESS;
  }
  if (username) {
    filter.username = username;
  }

  if (!live) {
    return match.getModel().find(filter, { __v: 0 }).sort({ datetimeBegin: -1 }).then((matchDocuments) => {
      const filteredMatchDocuments = matchDocuments.slice(skip, skip+limit);
      const body: GetMatchesResponseBody = { error: false, statusCode: 200, matches: filteredMatchDocuments as any };
      return res.status(200).json(body);
    })
    .catch((err) => {
      console.error('Internal DB error ' + JSON.stringify(err, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      return next(errorBody);
    });
  }
  else {
    try {
      const matchDocuments = await match.getModel().find(filter, { __v: 0 });

      const matchPlayersRatingsPromises: Promise<number[]>[] = [];
      for (let matchDocument of matchDocuments) {
        const matchPlayersRatingsPromise = Promise.all([
          stats.getModel().findOne({ player: matchDocument.player1 }, { rating: 1 }).then(statsDocument => {
            return statsDocument!.rating;
          }),
          stats.getModel().findOne({ player: matchDocument.player2 }, { rating: 1 }).then(statsDocument => {
            return statsDocument!.rating;
          })
        ]);
        matchPlayersRatingsPromises.push(matchPlayersRatingsPromise);
      }
      const matchPlayersRatings = await Promise.all(matchPlayersRatingsPromises);
      const matchRatings: number[] = matchPlayersRatings.map(matchRatings => (matchRatings[0] + matchRatings[1]) / 2);

      const sortedMatchDocuments = matchDocuments
        .map((matchDocument, index) => ({ rating: matchRatings[index], document: matchDocument }))
        .sort((a, b) => b.rating - a.rating)
        .map(matchObject => matchObject.document);

      const filteredMatchDocuments = sortedMatchDocuments.slice(skip, skip+limit);
      const body: GetMatchesResponseBody = { error: false, statusCode: 200, matches: filteredMatchDocuments as any };
      return res.status(200).json(body);
    }
    catch (err) {
      console.error('Internal DB error ' + JSON.stringify(err, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      return next(errorBody);
    }
  }
});

router.get(`/:match_id`, auth, (req, res, next) => {
  const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);
  match.getModel().findOne({ _id: matchId }, { __v: 0 }).then((document) => {
    if (!document) {
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    const body: GetMatchResponseBody = { error: false, statusCode: 200, match: document as any };
    return res.status(200).json(body);
  }).catch((err) => {
    if (err.statusCode === 404) {
      console.warn('A client asked for a non existing match: ' + req.params.match_id);
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});


// TODO socket.io (notificare i giocatori)
router.post(`/:match_id`, auth, (req, res, next) => {
  const io = getSocketIO();

  if (!isAddMoveRequestBody(req.body)) {
    console.warn('Wrong body content for the add move');
    const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong body content' };
    return next(errorBody);
  }

  const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);
  match.getModel().findOne({ _id: matchId }, { __v: 0 }).then((matchDocument) => {
    if (!matchDocument) {
      console.warn('A client asked for a non existing match: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    try {
      matchDocument.addMove(req.user!.username, req.body.column);
      return matchDocument.save();
    }
    catch (err) {
      console.warn('Add move error: ' + err.message);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: err.message };
      throw errorBody;
    }
  })
  .then( matchDocument => {
    // Notify the 2 players (all the sockets)
    const player1Sockets = transientDataHandler.getPlayerSockets(matchDocument.player1);
    for(let player1Socket of player1Sockets){
      player1Socket.emit('match', matchDocument._id);
    }
    const player2Sockets = transientDataHandler.getPlayerSockets(matchDocument.player2);
    for(let player2Socket of player2Sockets){
      player2Socket.emit('match', matchDocument._id);
    }

    // Notify all the observers
    const roomName = 'observersRoom:' + matchDocument._id.toString();
    io.to(roomName).emit('match', matchDocument._id);

    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  })
  .catch((err) => {
    if (err.statusCode) {
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});


// TODO socket.io (notificare i giocatori)
router.put(`/:match_id`, auth, (req, res, next) => {
  const io = getSocketIO();

  const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);
  match.getModel().findOne({ _id: matchId }, { __v: 0 }).then((matchDocument) => {
    if (!matchDocument) {
      console.warn('A client asked for a non existing match: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    try {
      matchDocument.forfait(req.user!.username);
      return matchDocument.save();
    }
    catch (err) {
      console.warn('Forfait error: ' + err.message);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: err.message };
      throw errorBody;
    }
  })
  .then( matchDocument =>{
    // Notify the 2 players (all the sockets)
    const player1Sockets = transientDataHandler.getPlayerSockets(matchDocument.player1);
    for(let player1Socket of player1Sockets){
      player1Socket.emit('match', matchDocument._id);
    }
    const player2Sockets = transientDataHandler.getPlayerSockets(matchDocument.player2);
    for(let player2Socket of player2Sockets){
      player2Socket.emit('match', matchDocument._id);
    }

    // Notify all the observers
    const roomName = 'observersRoom:' + matchDocument._id.toString();
    io.to(roomName).emit('match', matchDocument._id);

    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  })
  .catch((err) => {
    if (err.statusCode) {
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});

router.post('/:match_id/observers', auth, (req, res, next) =>{
  const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);
  match.getModel().findOne({_id:matchId}).then( matchDocument => {
    if (!match) {
      console.warn('A client asked to be an observer for a non existing match: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    // Insert all the player sockets in the match observers room
    const roomName = 'observersRoom:' + req.params.match_id;
    const playerSockets = transientDataHandler.getPlayerSockets(req.user!.username);
    for(let playerSocket of playerSockets){
      playerSocket.join(roomName);
    }
    return;
  }).catch((err) => {
    if (err.statusCode) {
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});

router.delete('/:match_id/observers', auth, (req, res, next) =>{
  const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);
  match.getModel().findOne({_id:matchId}).then( matchDocument => {
    if (!match) {
      console.warn('A client asked to exit as an observer from a non existing match: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    // Take out all the player sockets in the match observers room
    const roomName = 'observersRoom:' + req.params.match_id;
    const playerSockets = transientDataHandler.getPlayerSockets(req.user!.username);
    for(let playerSocket of playerSockets){
      playerSocket.leave(roomName);
    }
    return;
  }).catch((err) => {
    if (err.statusCode) {
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});
