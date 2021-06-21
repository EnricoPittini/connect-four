import { io, Socket } from 'socket.io-client';
import ClientEvents from 'src/app/models/eventTypes/client-events.model';
import ServerEvents from 'src/app/models/eventTypes/server-events.model';


const BASE_SOCKET_URL = 'http://localhost:8080';

let socket: Socket<ServerEvents, ClientEvents>;

export default function getSocket(): Socket<ServerEvents, ClientEvents> {
  if (!socket) {
    socket = io(BASE_SOCKET_URL);
  }

  return socket;
}
