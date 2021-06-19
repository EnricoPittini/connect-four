import { Server, Socket } from 'socket.io';
import jsonwebtoken = require('jsonwebtoken');    // JWT generation

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from "../TransientDataHandler";

import player = require('../models/Player');
import match = require('../models/Match');
import { MatchStatus, MatchDocument } from '../models/Match';


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

  socket.on('disconnect', () => {
    console.info('Socket event: "disconnect"');

    const username = transientDataHandler.getSocketPlayer(socket);
    if (!username) {          // not registered socket, probably the player is offline
      return;
    }

    transientDataHandler.removePlayerSocket(socket);

    if (transientDataHandler.isOnline(username)) {
      return;
    }

    // the player has become offline

    // Notify all his friends
    player.getModel().findOne({ username: username }, { friends: 1 }).then(playerDocument => {
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
    });

    // Notify all the match requests opponents associated with that player
    const matchRequestsOpponents = transientDataHandler.getPlayerMatchRequestsOpponents(username);
    for(let opponent of matchRequestsOpponents){
      const opponentSockets = transientDataHandler.getPlayerSockets(opponent);
      for(let opponentSocket of opponentSockets){
        opponentSocket.emit('deleteMatchRequest', {
          sender: username,
          receiver: opponent
        });
      }
    }
    // Remove all the match requests associated with that player
    transientDataHandler.deletePlayerMatchRequests(username);

    // Authomatic forfait for the player
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
    match.getModel().find(filter).then( matchDocuments => {
      // The matches that the player was playing (In theory either one or zero)
      // Authomatic forfait for all these matches
      const promises : Promise<MatchDocument>[] = [];
      for(let matchDocument of matchDocuments){
        matchDocument.forfait(username);
        promises.push(matchDocument.save());
      }

      return Promise.all(promises);
    })
    .then( matchDocuments =>{
      // Notify all the opponents and observers about the forfait
      for(let matchDocument of matchDocuments){
        // Notify the opponent (all his sockets)
        const opponent = matchDocument.player1===username ? matchDocument.player2 : matchDocument.player1;
        const opponentSockets = transientDataHandler.getPlayerSockets(opponent);
        for(let opponentSocket of opponentSockets){
          opponentSocket.emit('match', matchDocument._id);
        }

        // Notify all the observers
        const roomName = 'observersRoom:' + matchDocument._id.toString();
        io.to(roomName).emit('match', matchDocument._id);
      }
      return;
    })
    .catch(err=>{
      console.warn("An error occoured: " + err);
      return;
    })
  });
}
