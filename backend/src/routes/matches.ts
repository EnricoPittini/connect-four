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



// A player wants to add a move in the specified match
router.post(`/:match_id`, auth, async (req, res, next) => {
  const io = getSocketIO();

  // Not valid body
  if (!isAddMoveRequestBody(req.body)) {
    console.warn('Wrong body content for the add move');
    const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: 'Wrong body content' };
    return next(errorBody);
  }

  try{
    const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);
    // Search for the match document
    const matchDocument = await match.getModel().findOne({ _id: matchId }, { __v: 0 }).exec();
    if (!matchDocument) {
      console.warn('A client asked for a non existing match: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    try {
      // Try to add the move
      matchDocument.addMove(req.user!.username, req.body.column);
    }
    catch (err) { // Catch and forward the add move error
      console.warn('Add move error: ' + err.message);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: err.message };
      throw errorBody;
    } 
    await matchDocument.save();

    // Notify the 2 players (all the sockets)
    const player1Sockets = transientDataHandler.getPlayerSockets(matchDocument.player1);
    for(let player1Socket of player1Sockets){
      player1Socket.emit('match', matchDocument._id.toString());
    }
    const player2Sockets = transientDataHandler.getPlayerSockets(matchDocument.player2);
    for(let player2Socket of player2Sockets){
      player2Socket.emit('match', matchDocument._id.toString());
    }

    // Notify all the observers
    const roomName = 'observersRoom:' + matchDocument._id.toString();
    io.to(roomName).emit('match', matchDocument._id.toString());

    // Check if the match is ended
    if(matchDocument.status!==MatchStatus.IN_PROGRESS){
      // All the observers have to leave the match room
      const observersSocketsId = io.sockets.adapter.rooms.get(roomName);
      if(observersSocketsId){ // The match observers room exists
        observersSocketsId.forEach( socketId => {
          const observerSocket = io.sockets.sockets.get(socketId);
          observerSocket?.leave(roomName);
        } );
      }

      // Put as out of game the two players
      transientDataHandler.markOffGame(matchDocument.player1);
      transientDataHandler.markOffGame(matchDocument.player2);

      // Find the stats documents of the 2 players, in order to refresh them
      const statsDocumentPlayer1 = await stats.getModel().findOne({player:matchDocument.player1}).exec();
      const statsDocumentPlayer2 = await stats.getModel().findOne({player:matchDocument.player2}).exec();
      if(!statsDocumentPlayer1 || !statsDocumentPlayer2){
        console.error('At least one of the player of the match doesn\'t have an associated stats document');
        const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
        throw errorBody;
      }
      await statsDocumentPlayer1.refresh(matchDocument);
      await statsDocumentPlayer2.refresh(matchDocument);
      await statsDocumentPlayer1.save();
      await statsDocumentPlayer2.save();
    }

    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  }
  catch(err){
      if (err.statusCode) {
        return next(err);
      }
      console.error('Internal DB error ' + JSON.stringify(err, null, 2));
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
      return next(errorBody);
  }
});



// A player wants to end prematurely his match
router.put(`/:match_id`, auth, async (req, res, next) => {
  const io = getSocketIO();

  try{
    const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);
    // Search for the match document
    const matchDocument = await match.getModel().findOne({ _id: matchId }, { __v: 0 }).exec();
    if (!matchDocument) {
      console.warn('A client asked for a non existing match: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    try {
      // Try to do the forfait
      matchDocument.forfait(req.user!.username);
    }
    catch (err) {
      console.warn('Forfait error: ' + err.message);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 400, errorMessage: err.message };
      throw errorBody;
    }
    await matchDocument.save();
    
    // Notify the 2 players (all the sockets)
    const player1Sockets = transientDataHandler.getPlayerSockets(matchDocument.player1);
    for(let player1Socket of player1Sockets){
      player1Socket.emit('match', matchDocument._id.toString());
    }
    const player2Sockets = transientDataHandler.getPlayerSockets(matchDocument.player2);
    for(let player2Socket of player2Sockets){
      player2Socket.emit('match', matchDocument._id.toString());
    }

    // Notify all the observers
    const roomName = 'observersRoom:' + matchDocument._id.toString();
    io.to(roomName).emit('match', matchDocument._id.toString());

    // All the observers have to leave the match room
    const observersSocketsId = io.sockets.adapter.rooms.get(roomName);
    if(observersSocketsId){ // The match observers room exists
      observersSocketsId.forEach( socketId => {
        const observerSocket = io.sockets.sockets.get(socketId);
        observerSocket?.leave(roomName);
      } );
    }

    // Put as out of game the two players
    transientDataHandler.markOffGame(matchDocument.player1);
    transientDataHandler.markOffGame(matchDocument.player2);

    // Find the stats documents of the 2 players, in order to refresh them
    const statsDocumentPlayer1 = await stats.getModel().findOne({player:matchDocument.player1}).exec();
    const statsDocumentPlayer2 = await stats.getModel().findOne({player:matchDocument.player2}).exec();
    if(!statsDocumentPlayer1 || !statsDocumentPlayer2){
      console.error('At least one of the player of the match doesn\'t have an associated stats document');
      const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal Server error' };
      throw errorBody;
    }
    await statsDocumentPlayer1.refresh(matchDocument);
    await statsDocumentPlayer2.refresh(matchDocument);
    await statsDocumentPlayer1.save();
    await statsDocumentPlayer2.save();

    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);
  }
  catch(err){
    if (err.statusCode) {
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  }
});



// Endpoint to become an observer of a game
router.post('/:match_id/observers', auth, (req, res, next) =>{
  const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);

  // Search for the match
  match.getModel().findOne({_id:matchId}).then( matchDocument => {
    if (!matchDocument) {
      console.warn('A client asked to be an observer for a non existing match: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    //Check if the player is one of the two players of the match
    if(req.user!.username===matchDocument.player1 || req.user!.username===matchDocument.player2){
      console.warn('A client asked to be an observer for a match in which he is playing: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { 
        error: true, 
        statusCode: 404, 
        errorMessage: 'You can\'t become an observer of a match in which you are playing' 
      };
      throw errorBody;
    }

    // Check if the player is alredy an observer of another match
    const playerSockets = transientDataHandler.getPlayerSockets(req.user!.username);
    for(let playerSocket of playerSockets){ // At least one of the player sockets is in alredy an abserver
      if(playerSocket.rooms.size>0){ 
        console.warn('A client asked to be an observer while he is alredy an observer, match_id: ' + req.params.match_id);
        const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'You are alredy an observer of another match' };
        throw errorBody;
      }
    }

    // Now I can insert all the player sockets in the match observers room
    const roomName = 'observersRoom:' + req.params.match_id;
    for(let playerSocket of playerSockets){
      playerSocket.join(roomName);
    }
    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);

  }).catch((err) => {
    if (err.statusCode) {
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});

// Endpoint to not be anymore an observer of a match
router.delete('/:match_id/observers', auth, (req, res, next) =>{
  const matchId = new mongoose.SchemaTypes.ObjectId(req.params.match_id);

  // Search for the match
  match.getModel().findOne({_id:matchId}).then( matchDocument => {
    if (!matchDocument) {
      console.warn('A client asked to exit as an observer from a non existing match: ' + req.params.match_id);
      const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'The selected match doesn\'t exist' };
      throw errorBody;
    }

    const roomName = 'observersRoom:' + req.params.match_id;

    // Check if the player is not an observer of that match
    const playerSockets = transientDataHandler.getPlayerSockets(req.user!.username);
    for(let playerSocket of playerSockets){ // All the player sockets must be in the match room
      if(!playerSocket.rooms.has(roomName)){ 
        console.warn('A client asked to not be anymore an observer of a match he wasn\'t observing, match_id: '
                     + req.params.match_id);
        const errorBody: ErrorResponseBody = { error: true, statusCode: 404, errorMessage: 'You are not an observer of that match' };
        throw errorBody;
      }
    }

    // Now I can take out all the player sockets from the match observers room
    for(let playerSocket of playerSockets){
      playerSocket.leave(roomName);
    }
    const body: SuccessResponseBody = { error: false, statusCode: 200 };
    return res.status(200).json(body);

  }).catch((err) => {
    if (err.statusCode) {
      return next(err);
    }
    console.error('Internal DB error ' + JSON.stringify(err, null, 2));
    const errorBody: ErrorResponseBody = { error: true, statusCode: 500, errorMessage: 'Internal DB error' };
    return next(errorBody);
  })
});
