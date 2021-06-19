
export interface ClientMessage{
  to : string,
  text: string,
}

/**
 * Events emitted from the clients.
 */
export default interface ClientEvents {

  'online': (jwtToken: string) => void;

  'chat': (message: ClientMessage) => void;
}
