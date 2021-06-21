import { Server, Socket } from 'socket.io';
import jsonwebtoken = require('jsonwebtoken');    // JWT generation

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from "../TransientDataHandler";

import player = require('../models/Player');
import match = require('../models/Match');
import { MatchStatus, MatchDocument } from '../models/Match';
import stats = require('../models/Stats');


export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {
  const transientDataHandler = TransientDataHandler.getInstance();

  socket.on('online', (jwtToken) => {
    console.info('Socket event: "online"');

    try {
      const playerToken: Express.User = jsonwebtoken.verify(jwtToken, process.env.JWT_SECRET as string) as Express.User;
      const username = playerToken.username;

      const wasOnline = transientDataHandler.isOnline(username);

      transientDataHandler.addPlayerSocket(username, socket);

      if (wasOnline) {
        return;
      }

      // the player was offline, and now is online: notify all his friends

      player.getModel().findOne({ username: username }, { friends: 1 }).then(playerDocument => {
        if (!playerDocument) {
          console.warn('An invalid player connected, username: ', username);
          return;
        }

        for (let friendUsername of playerDocument.friends) {
          const friendSockets = transientDataHandler.getPlayerSockets(friendUsername);

          for (let friendSocket of friendSockets) {
            friendSocket.emit('friendOnline', username);
          }
        }
      });

    } catch (err) {
      console.warn('A socket sent an invalid JWT token');
    }
  });

  // A socket disconnected
  socket.on('disconnect', async () => {
    console.info('Socket event: "disconnect"');

    const username = transientDataHandler.getSocketPlayer(socket);
    if (!username) {          // not registered socket, probably the player is offline
      return;
    }

    transientDataHandler.removePlayerSocket(socket);

    if (transientDataHandler.isOnline(username)) {
      return;
    }

    // The player has become offline: several actions to do

    try{
      // Notify all his friends
      const playerDocument = await player.getModel().findOne({ username: username }, { friends: 1 }).exec();
      if (!playerDocument) {
        console.warn('An invalid player disconnected, username: ', username);
        return;
      }
      for (let friendUsername of playerDocument.friends) {
        const friendSockets = transientDataHandler.getPlayerSockets(friendUsername);
        for (let friendSocket of friendSockets) {
          friendSocket.emit('friendOffline', username);
        }
      }

      // Notify all the match requests opponents associated with that player (both senders and receivers)
      const friendMatchRequestsOpponents = transientDataHandler.getPlayerFriendMatchRequestsOpponents(username);
      for(let opponent of friendMatchRequestsOpponents){
        const opponentSockets = transientDataHandler.getPlayerSockets(opponent);
        for(let opponentSocket of opponentSockets){
          opponentSocket.emit('deleteFriendMatchRequest', {
            sender: username,
            receiver: opponent
          });
        }
      }
      // Remove all the match requests associated with that player
      transientDataHandler.deletePlayerFriendMatchRequests(username);

      // Remove the (potential) random match request
      if(transientDataHandler.hasRandomMatchReuqest(username)){
        transientDataHandler.deleteRandomFriendMatchRequests(username);
      }

      // Authomatic forfait of the player in all the matches in which he is playing (In theory either one or zero) 
      const filter = {
        $or:[
          {
            player1: username,
            status: MatchStatus.IN_PROGRESS
          },
          {
            player2: username,
            status: MatchStatus.IN_PROGRESS
          }
        ]
      }
      // The matches that the player was playing (In theory either one or zero). Authomatic forfait for all these matches
      const matchDocuments = await match.getModel().find(filter).exec();
      const promises : Promise<MatchDocument>[] = [];
      for(let matchDocument of matchDocuments){
        matchDocument.forfait(username);
        promises.push(matchDocument.save());
      }
      await Promise.all(promises);

      // Ending all these matches
      for(let matchDocument of matchDocuments){
        // Notify the opponent of the match (all his sockets)
        const opponent = matchDocument.player1===username ? matchDocument.player2 : matchDocument.player1;
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

        // Find the stats documents of the 2 players of the match, in order to refresh them
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
      transientDataHandler.markOffGame(username);
      return;
    }
    catch(err){
      console.warn("An internal DB error occoured: " + JSON.stringify(err,null,2));
      return;
    }
  });
}
