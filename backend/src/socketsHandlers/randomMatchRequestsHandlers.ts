import { Server, Socket } from 'socket.io';

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from '../TransientDataHandler';

import player = require('../models/Player');
import match = require('../models/Match');
import { NewMatchParams } from '../models/Match';


export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {
  const transientDataHandler = TransientDataHandler.getInstance();

  socket.on('randomMatchRequest', () => {
    console.info('Socket event: "randomMatchRequest"');

    // Player that sent the request
    const username = transientDataHandler.getSocketPlayer(socket);
    if(!username){
      console.warn('An invalid player sent a random match request, username: ' + username);
      return;
    }

    // I search for the player
    player.getModel().findOne({ username: username }).then(playerDocument => {
      if (!playerDocument) {
        throw new Error('An invalid player sent a random match request, username: ' + username);
      }

      return transientDataHandler.addRandomMatchRequest(username);
    })
    .then( () => {
        // Notify the player (all the sockets)
        const playerSockets = transientDataHandler.getPlayerSockets(username);
        for (let playerSocket of playerSockets) {
          playerSocket.emit('randomMatchRequest');
        }

        return;
    })
    .catch( err =>{
      console.warn('An error occourred, err: ' + err);
    });
  });

  socket.on('cancelRandomMatchRequest', () => {
    console.info('Socket event: "cancelRandomMatchRequest"');

    // Player that asked to cancel
    const username = transientDataHandler.getSocketPlayer(socket);
    if(!username){
      console.warn('An invalid asked to cancel a random match request, username: ' + username);
      return;
    }

    transientDataHandler.deleteRandomFriendMatchRequests(username);

    // Notify the player (all the sockets)
    const playerSockets = transientDataHandler.getPlayerSockets(username);
    for (let playerSocket of playerSockets) {
      playerSocket.emit('cancelRandomMatchRequest');
    }
  });
}