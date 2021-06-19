import { Server, Socket } from 'socket.io';

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from '../TransientDataHandler';

import player = require('../models/Player');
import { PlayerType } from '../models/Player';
import chat = require('../models/Chat');
import { NewChatParams } from '../models/Chat';


export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {
  const transientDataHandler = TransientDataHandler.getInstance();

  socket.on('friendChat', (message) => {
    console.info('Socket event: "chat"');

    // Player that sent the message
    const fromUsername = transientDataHandler.getSocketPlayer(socket);
    if(!fromUsername){
      console.warn('An invalid player sent a message');
      return;
    }

    // Player receiver of the message
    const toUsername = message.to;

    // I search the "to player"
    player.getModel().findOne({ username: toUsername }).then(toPlayerDocument => {
      if (!toPlayerDocument) {
        throw new Error('A player sent a message to an inalid player; fromUsername: ' + fromUsername + ' ,toUsername: ' + toUsername);
      }
      return player.getModel().findOne({ username: fromUsername }, { friends: 1 });
    })
    // I search the "from player"
    .then(fromPlayerDocument => {
      if (!fromPlayerDocument) {
        throw new Error('An invalid player sent a message, username: ' + fromUsername);
      }

      const fromPlayerType = fromPlayerDocument.type;

      if(fromPlayerType!==PlayerType.MODERATOR && (!fromPlayerDocument.friends.find( el => el===toUsername ))){
        throw new Error('A  Standard player sent a message to another player that isn\'t his friend; fromUsername: '
                         + fromUsername + ' ,toUsername: ' + toUsername);
      }

      // Here I'm sure that the "from player" can send a message to the "to player"

      // I find the chat between the two players
      const filter = {
        $or: [
          { from: fromUsername, to: toUsername },
          { from: toUsername, to: fromUsername },
        ],
      };
      return chat.getModel().findOne(filter);
    })
    .then( chatDocument => {      
      if(!chatDocument){
        // The chat between the players doesn't exist : I have to create a new one
        const data : NewChatParams = {
          playerA : fromUsername, // Convenction : playerA is the one that started the chat
          playerB : toUsername
        }
        return chat.newChat(data); // TODO : salvare il documento o no?
      }
      return chatDocument;
    })
    .then( chatDocument => {
      // I add the message to the chat
      chatDocument.addMessage(fromUsername, message.text);
      return chatDocument.save();
    })
    .then( _ =>{
      // Notify the "from player"
      const fromPlayerSockets = transientDataHandler.getPlayerSockets(fromUsername);
      for (let fromPlayerSocket of fromPlayerSockets) {
        fromPlayerSocket.emit('chat', {
          from: fromUsername,
          to: toUsername,
          text: message.text
        });
      }

      // Notify the "to player"
      const toPlayerSockets = transientDataHandler.getPlayerSockets(toUsername);
      for (let toPlayerSocket of toPlayerSockets) {
        toPlayerSocket.emit('chat', {
          from: fromUsername,
          to: toUsername,
          text: message.text
        });
      }
    })
    .catch(err =>{
      console.warn("An error occoured: " + err);
      return;
    });  
  });
}