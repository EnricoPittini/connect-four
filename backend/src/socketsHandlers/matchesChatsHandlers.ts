import { Server, Socket } from 'socket.io';

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from '../TransientDataHandler';

import player = require('../models/Player');
import match = require('../models/Match');


/**
 * Registers to the specified Client socket the handlers about the matches chats managment
 * @param io 
 * @param socket 
 */
export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {

  const transientDataHandler = TransientDataHandler.getInstance();

  // Handler of the matchChat event 
  socket.on('matchChat', async (message) => {
    console.info('Socket event: "matchChat"');

    try{
      // Player that sent the message
      const fromUsername = transientDataHandler.getSocketPlayer(socket);
      if(!fromUsername){
        console.warn('An invalid player sent a message');
        return;
      }

      // Search the player document
      const playerDocument = await player.getModel().findOne({username: fromUsername});
      if(!playerDocument){
        throw new Error('An invalid player sent a message, username: ' + fromUsername);
      }

      // Search the match document
      const matchDocument = await match.getModel().findOne({_id:message.matchId});
      if(!matchDocument){
        throw new Error('A player sent a message to an invalid match, match_id: ' + message.matchId);
      }

      // Name of the observers room
      const roomName = 'observersRoom:' + matchDocument._id.toString();

      // Check if the player is not one of the players and is not one of the observers
      if(matchDocument.player1!==fromUsername && matchDocument.player2!==fromUsername){
        // The player is not one of the two players of the match. I check if it's not one of the observers
        const playerSockets = transientDataHandler.getPlayerSockets(fromUsername);
        for(let playerSocket of playerSockets){
          if(!playerSocket.rooms.has(roomName)){ // At least one of the players sockets is not inside the match room
            throw new Error('A player sent a message to a match in which he doesn\'t either play or observe, match_id: ' 
                            + message.matchId);
          }
        }
      }

      // Here I'm sure the player can send the message (Or is one of the players of the match or is one of the observers)

      if(matchDocument.player1===fromUsername || matchDocument.player2===fromUsername){
        // The sender of the message is one of the two players : I send the message also to the two players
        const player1Sockets = transientDataHandler.getPlayerSockets(matchDocument.player1);
        for(let player1Socket of player1Sockets){
          player1Socket.emit('matchChat', {
            from: fromUsername,
            text: message.text
          });
        }
        const player2Sockets = transientDataHandler.getPlayerSockets(matchDocument.player2);
        for(let player2Socket of player2Sockets){
          player2Socket.emit('matchChat', {
            from: fromUsername,
            text: message.text
          });
        }
      }

      // Send the message to all the observers of the match
      io.to(roomName).emit('matchChat', {
        from: fromUsername,
        text: message.text
      });    
    }
    catch(err){
        console.warn("An error occoured: " + err);
        return;    
    }
  });
};