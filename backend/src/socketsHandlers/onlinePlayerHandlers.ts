import { Server, Socket } from 'socket.io';
import jsonwebtoken = require('jsonwebtoken');    // JWT generation

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from "../TransientDataHandler";

import player = require('../models/Player');


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

    // the player has become offline, notify all his friends

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
  });
}
