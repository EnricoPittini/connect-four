export interface FromClientMessage {
  to : string,
  text: string
}

/**
 * Events emitted from the clients.
 */
export default interface ClientEvents {

  'online': (jwtToken: string) => void;

  /**
   * Send a message to the specified username
   */
  'chat': (message: FromClientMessage) => void; 

  /**
   * Notify the Server the availability to play a match with the specified friend
   */
  'matchRequest': (toUsername : string)=> void;

  /**
   * Notify the Server the unavailability to play a match with the specified friend
   */
  'deleteMatchRequest': (toUsername: string) => void;
}
