import { Server, Socket } from 'socket.io';

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from '../TransientDataHandler';

import player = require('../models/Player');
import match = require('../models/Match');
import { NewMatchParams } from '../models/Match';


/**
 * Registers to the specified Client socket the handlers about the random match requests managment
 * @param io 
 * @param socket 
 */
export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {

  const transientDataHandler = TransientDataHandler.getInstance();

  // Handler of the randomMatchRequest event
  socket.on('randomMatchRequest', () => {
    console.info('Socket event: "randomMatchRequest"');

    // Player that sent the request
    const username = transientDataHandler.getSocketPlayer(socket);
    if(!username){
      console.warn('An invalid player sent a random match request');
      return;
    }

    // Search for the player
    player.getModel().findOne({ username: username }).then(playerDocument => {
      if (!playerDocument) {
        throw new Error('An invalid player sent a random match request, username: ' + username);
      }

      // The several checks are made by transientDataHandler
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

  // Handler of the cancelRandomMatchRequest event
  socket.on('cancelRandomMatchRequest', () => {
    console.info('Socket event: "cancelRandomMatchRequest"');

    // Player that asked to cancel
    const username = transientDataHandler.getSocketPlayer(socket);
    if(!username){
      console.warn('An invalid player asked to cancel a random match request');
      return;
    }

    // Delete the random requests (if any)
    const deleted = transientDataHandler.deleteRandomMatchRequests(username);

    if(deleted){ // Something was deleted
      // Notify the player (all the sockets)
      const playerSockets = transientDataHandler.getPlayerSockets(username);
      for (let playerSocket of playerSockets) {
        playerSocket.emit('cancelRandomMatchRequest');
      }
      return;
    }
    else{
      console.warn('Nothing has been deleted');
      return;
    }
  });

  // Handler of the hasRandomMatchRequest event
  socket.on('hasRandomMatchRequest', () => {
    console.info('Socket event: "hasRandomMatchRequest"');

    // Player that asked if has a random match request
    const username = transientDataHandler.getSocketPlayer(socket);
    if(!username){
      console.warn('An invalid asked if has a random match request');
      return;
    }

    // Chek if the player has a random match request
    const flag = transientDataHandler.hasRandomMatchReuqest(username);

    // Notify the player (all the sockets)
    const playerSockets = transientDataHandler.getPlayerSockets(username);
    for (let playerSocket of playerSockets) {
      playerSocket.emit('hasRandomMatchRequest', flag);
    }
  });
}