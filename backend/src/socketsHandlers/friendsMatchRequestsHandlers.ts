import { Server, Socket } from 'socket.io';

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from '../TransientDataHandler';

import player = require('../models/Player');
import match = require('../models/Match');
import { NewMatchParams } from '../models/Match';


export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {
  const transientDataHandler = TransientDataHandler.getInstance();

  socket.on('friendMatchRequest', (toUsername) => {
    console.info('Socket event: "friendMatchRequest"');

    // Player that sent the request
    const fromUsername = transientDataHandler.getSocketPlayer(socket);
    if(!fromUsername){
      console.warn('An invalid player sent a message');
      return;
    }

    // I search the "from player"
    player.getModel().findOne({ username: fromUsername }, { friends: 1 }).then(fromPlayerDocument => {
      if (!fromPlayerDocument) {
        throw new Error('An invalid player sent a message, username: ' + fromUsername);
      }

      // With this condition we check not only that the "to player" is a friend of "from player", but also that "to player" is a 
      // valid player 
      if(!fromPlayerDocument.friends.find( el => el===toUsername )){
        throw new Error('A player sent a match request to another player that isn\'t his friend; fromUsername: ' 
                         + fromUsername + ' ,toUsername: ' + toUsername);
      }

      if(transientDataHandler.hasFriendMatchRequest(fromUsername, toUsername)){
        
        throw new Error('A match request sent from this "from player" to this "to player" alredy exists; fromUsername: '
                         + fromUsername + ' ,toUsername: ' + toUsername);
      }

      if(!transientDataHandler.isOnline(fromUsername) || transientDataHandler.isOnline(toUsername)){
        throw new Error('At least one of the two players is offline; fromUsername: ' + fromUsername + ' ,toUsername: ' + toUsername);
      }

      if(transientDataHandler.isInGame(fromUsername) || transientDataHandler.isInGame(toUsername)){
        throw new Error('At least of the two players is alredy in game; fromUsername: ' + fromUsername + ' ,toUsername: ' + toUsername);
      }

      // Here I have checked all the possible errors

      if(!transientDataHandler.hasFriendMatchRequest(toUsername, fromUsername)){
        // The "to player" hasn't sent a match request to "from player" yet

        // Create a new match request
        transientDataHandler.addFriendMatchRequest(fromUsername, toUsername);

        // Notify the "from player"
        const fromPlayerSockets = transientDataHandler.getPlayerSockets(fromUsername);
        for (let fromPlayerSocket of fromPlayerSockets) {
          fromPlayerSocket.emit('friendMatchRequest', {
            sender: fromUsername,
            receiver: toUsername
          });
        }

        // Notify the "to player"
        const toPlayerSockets = transientDataHandler.getPlayerSockets(toUsername);
        for (let toPlayerSocket of toPlayerSockets) {
          toPlayerSocket.emit('friendMatchRequest', {
            sender: fromUsername,
            receiver: toUsername
          });
        }

        return;
      }

      // The "to player" has alredy sent a match request to "from player" : new match

      // Randomly decide who is player1
      const whichPlayer1 = Math.floor(Math.random());
      const player1 = whichPlayer1===0 ? fromUsername : toUsername;
      const player2 = whichPlayer1===0 ? toUsername : fromUsername;

      const data : NewMatchParams = {
        player1: player1,
        player2: player2
      };
      return match.newMatch( data ).save();
    })
    .then( result => {      
      if(result){ // The new match is created 

        // Mark in game both the players
        transientDataHandler.markInGame(fromUsername);
        transientDataHandler.markInGame(toUsername);

        // Notify the "from player"
        const fromPlayerSockets = transientDataHandler.getPlayerSockets(fromUsername);
        for (let fromPlayerSocket of fromPlayerSockets) {
          fromPlayerSocket.emit('newMatch', toUsername);
        }

        // Notify the "to player"
        const toPlayerSockets = transientDataHandler.getPlayerSockets(toUsername);
        for (let toPlayerSocket of toPlayerSockets) {
          toPlayerSocket.emit('newMatch', fromUsername);
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

  socket.on('deleteFriendMatchRequest', (toUsername) => {
    console.info('Socket event: "deleteFriendMatchRequest"');

    // Player that sent the request
    const fromUsername = transientDataHandler.getSocketPlayer(socket);
    if(!fromUsername){
      console.warn('An invalid player sent a message');
      return;
    }

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