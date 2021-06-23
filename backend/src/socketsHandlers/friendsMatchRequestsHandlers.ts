import { Server, Socket } from 'socket.io';

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from '../TransientDataHandler';

import player = require('../models/Player');
import match = require('../models/Match');
import { NewMatchParams } from '../models/Match';

import { ensureNotFirstAccessModerator } from './ensureNotFirstAccessModerator';


/**
 * Registers to the specified Client socket the handlers about the friends match requests managment 
 * @param io 
 * @param socket 
 */
export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {

  const transientDataHandler = TransientDataHandler.getInstance();

  // Handler of the friendMatchRequest event
  socket.on('friendMatchRequest', (toUsername) => {
    console.info('Socket event: "friendMatchRequest"');

    // Player that sent the request
    const fromUsername = transientDataHandler.getSocketPlayer(socket);
    if(!fromUsername){
      console.warn('An invalid player sent a message');
      return;
    }

    // Search the "from player"
    player.getModel().findOne({ username: fromUsername }).then(fromPlayerDocument => {
      if (!fromPlayerDocument) {
        throw new Error('An invalid player sent a message, username: ' + fromUsername);
      }

      ensureNotFirstAccessModerator(fromPlayerDocument);

      // With this condition we check not only that the "to player" is a friend of "from player", but also that "to player" is a 
      // valid player 
      if(!fromPlayerDocument.hasFriend(toUsername)){
        throw new Error('A player sent a match request to another player that isn\'t his friend; fromUsername: ' 
                         + fromUsername + ' ,toUsername: ' + toUsername);
      }

      if(transientDataHandler.hasFriendMatchRequest(fromUsername, toUsername)){        
        throw new Error('A match request sent from this "from player" to this "to player" alredy exists; fromUsername: '
                         + fromUsername + ' ,toUsername: ' + toUsername);
      }

      if(!transientDataHandler.isOnline(fromUsername) || !transientDataHandler.isOnline(toUsername)){
        throw new Error('At least one of the two players is offline; fromUsername: ' + fromUsername + ' ,toUsername: ' + toUsername);
      }

      if(transientDataHandler.isInGame(fromUsername) || transientDataHandler.isInGame(toUsername)){
        throw new Error('At least of the two players is alredy in game; fromUsername: ' + fromUsername + ' ,toUsername: ' + toUsername);
      }

      // Here we have checked all the possible errors. We can perform the operation 

      // Check if alredy exists a friend match request made by "to player" to "from player"
      if(!transientDataHandler.hasFriendMatchRequest(toUsername, fromUsername)){
        // The "to player" hasn't sent a match request to "from player" yet

        // Create a new match request
        transientDataHandler.addFriendMatchRequest(fromUsername, toUsername);

        // Notify the "from player" (all the sockets)
        const fromPlayerSockets = transientDataHandler.getPlayerSockets(fromUsername);
        for (let fromPlayerSocket of fromPlayerSockets) {
          fromPlayerSocket.emit('friendMatchRequest', {
            sender: fromUsername,
            receiver: toUsername
          });
        }

        // Notify the "to player" (all the sockets)
        const toPlayerSockets = transientDataHandler.getPlayerSockets(toUsername);
        for (let toPlayerSocket of toPlayerSockets) {
          toPlayerSocket.emit('friendMatchRequest', {
            sender: fromUsername,
            receiver: toUsername
          });
        }

        return;
      }

      // The "to player" has alredy sent a match request to "from player" : new match.

      // Randomly decide who is player1
      const whichPlayer1 = Math.floor(Math.random());
      const player1 = whichPlayer1===0 ? fromUsername : toUsername;
      const player2 = whichPlayer1===0 ? toUsername : fromUsername;

      // Create the new match
      const data : NewMatchParams = {
        player1: player1,
        player2: player2
      };
      return match.newMatch( data ).save();
    })
    .then( matchDocument => {      
      if(matchDocument){ // The new match is created 

        // Mark in game both the players
        transientDataHandler.markInGame(fromUsername);
        transientDataHandler.markInGame(toUsername);

        // Notify the "from player"
        const fromPlayerSockets = transientDataHandler.getPlayerSockets(fromUsername);
        for (let fromPlayerSocket of fromPlayerSockets) {
          fromPlayerSocket.emit('newMatch', matchDocument._id.toString());
        }

        // Notify the "to player"
        const toPlayerSockets = transientDataHandler.getPlayerSockets(toUsername);
        for (let toPlayerSocket of toPlayerSockets) {
          toPlayerSocket.emit('newMatch', matchDocument._id.toString());
        }

        // Deleting all the match requests for both player
        transientDataHandler.deletePlayerFriendMatchRequests(fromUsername);
        transientDataHandler.deletePlayerFriendMatchRequests(toUsername);

        return;
      }
    })
    .catch(err =>{
      console.warn("An error occoured: " + err);
      return;
    });  
  });

  // Handler of the deleteFriendMatchRequest event
  socket.on('deleteFriendMatchRequest', (toUsername) => {
    console.info('Socket event: "deleteFriendMatchRequest"');

    // Player that sent the request
    const fromUsername = transientDataHandler.getSocketPlayer(socket);
    if(!fromUsername){
      console.warn('An invalid player sent a message');
      return;
    }

    // Delete the friend match requests between them (if any)
    let deleted = transientDataHandler.deleteFriendMatchRequest(fromUsername, toUsername);
    deleted = transientDataHandler.deleteFriendMatchRequest(toUsername, fromUsername) || deleted;

    if(deleted){ // Something has been deleted
      // Notify the "from player"
      const fromPlayerSockets = transientDataHandler.getPlayerSockets(fromUsername);
      for (let fromPlayerSocket of fromPlayerSockets) {
        fromPlayerSocket.emit('deleteFriendMatchRequest', {
          sender: fromUsername,
          receiver: toUsername,
        });
      }

      // Notify the "to player"
      const toPlayerSockets = transientDataHandler.getPlayerSockets(toUsername);
      for (let toPlayerSocket of toPlayerSockets) {
        toPlayerSocket.emit('deleteFriendMatchRequest', {
          sender: fromUsername,
          receiver: toUsername,
        });
      }
      return;
    }
    else{
      console.warn('Nothing has been deleted');
      return;
    }    
  });
}