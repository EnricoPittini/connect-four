import { Server, Socket } from 'socket.io';
import jsonwebtoken = require('jsonwebtoken');    // JWT generation

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { TransientDataHandler } from "../TransientDataHandler";


export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {

  socket.on('online', (jwtToken) => {
    console.info('Socket event: "online"');

    try {
      const playerToken: Express.User = jsonwebtoken.verify(jwtToken, process.env.JWT_SECRET as string) as Express.User;
      TransientDataHandler.getInstance().addPlayerSocket(playerToken.username, socket);
    } catch (err) {
      console.warn('A socket sent an invalid JWT token');
    }
  });

  socket.on('disconnect', () => {
    console.info('Socket event: "disconnect"');

    TransientDataHandler.getInstance().removePlayerSocket(socket);
  });
}
