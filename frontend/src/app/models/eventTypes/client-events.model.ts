/**
 * Represents the message sent by a Client to one of his friends
 */
export interface FromClientFriendMessage {
  to : string,
  text: string
}

/**
 * Represents the message sent by a Client to a match
 */
export interface FromClientChatMessage {
  matchId: string,
  text: string
}

/**
 * Events emitted from the clients.
 */
export default interface ClientEvents {

  /**
   * The Client socket notifies that he is online. He gives his JWT in order to be verified
   */
  'online': (jwtToken: string) => void;

  /**
   * The Client socket sends a message to the specified username
   */
  'friendChat': (message: FromClientFriendMessage) => void;

  /**
   * The Client socket notifies the Server his availability to play a match with the specified friend
   */
  'friendMatchRequest': (toUsername : string)=> void;

  /**
   * The Client socket notifies the Server the unavailability to play a match with the specified friend
   */
  'deleteFriendMatchRequest': (toUsername: string) => void;

  /**
   * The Client socket sends a message to the specified match
   */
  'matchChat': (text: FromClientChatMessage) => void;

  /**
   * The Client socket notify the Server the availability to play a random match
   */
  'randomMatchRequest': () => void;

  /**
   * The Client socket cancels the availability to play a random match
   */
  'cancelRandomMatchRequest': ()=> void;

  /**
   * The Client asks if he has done a random match request previously
   */
  'hasRandomMatchRequest': () => void;
}
