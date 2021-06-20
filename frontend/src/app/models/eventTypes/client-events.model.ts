// Interface that represents the message sent by a Client to one of his friends
export interface FromClientFriendMessage {
  to : string,
  text: string
}

// Interface that represents the message sent by a Client to one of his friends
export interface FromClientChatMessage {
  matchId: string,
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
  'friendChat': (message: FromClientFriendMessage) => void;

  /**
   * Notify the Server the availability to play a match with the specified friend
   */
  'friendMatchRequest': (toUsername : string)=> void;

  /**
   * Notify the Server the unavailability to play a match with the specified friend
   */
  'deleteFriendMatchRequest': (toUsername: string) => void;

  /**
   * Send a message to the specified match
   */
  'matchChat': (text: FromClientChatMessage) => void;

  /**
   * Notify the Server the availability to play a random match
   */
  'randomMatchRequest': () => void;

  /**
   * Cancel the availability to play a random match
   */
  'cancelRandomMatchRequest': ()=> void;
}
