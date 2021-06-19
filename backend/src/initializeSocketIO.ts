import http = require('http');
import { Server, Socket } from 'socket.io';
import ClientEvents from './socketsHandlers/eventTypes/ClientEvents';
import ServerEvents from './socketsHandlers/eventTypes/ServerEvents';

let io : Server<ClientEvents, ServerEvents>;

export function initializeSocketIO( server: http.Server){
  if(!io){
    io = new Server<ClientEvents, ServerEvents>(server);
  }
}

export function getSocketIO() : Server<ClientEvents, ServerEvents>{
  if(!io){
    throw new Error('The SocketIO is not initialized yet');
  }
  return io;
}