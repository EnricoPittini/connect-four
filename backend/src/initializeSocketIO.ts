import http = require('http');
import { Server, Socket } from 'socket.io';
import ClientEvents from './socketsHandlers/eventTypes/ClientEvents';
import ServerEvents from './socketsHandlers/eventTypes/ServerEvents';

// socketIO instance
let io : Server<ClientEvents, ServerEvents>;

/**
 * Initialize the socketIO instance
 * @param server 
 */
export function initializeSocketIO( server: http.Server){
  if(!io){
    io = new Server<ClientEvents, ServerEvents>(server);
  }
}

// Returns the socketIO instance
export function getSocketIO() : Server<ClientEvents, ServerEvents>{
  if(!io){
    throw new Error('The SocketIO is not initialized yet');
  }
  return io;
}