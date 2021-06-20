export interface ToClientFriendMessage {
  from : string,
  to : string,
  text: string
}

export interface ToClientMatchMessage{
  from : string,
  text: string
}

/**
 * Events emitted from the server.
 */
export default interface ServerEvents {

  'friendOffline': (username: string) => void;
  'friendOnline': (username: string) => void;

  'newFriendRequest': (username: string) => void;
  'newFriend': (username: string) => void;

  /**
   * Event for both rejecting or canceling the friend request
   */
  'cancelFriendRequest': (username: string) => void;

  'lostFriend': (username: string) => void;

  /**
   * Event for notify the player chat about a new message
   */
  'chat': (message: ToClientFriendMessage) => void;

  /**
   * Event for notify the player about a friend match request deletion (both canceled and rejected)
   */
  // TODO il tipo si può isolare, con nome SocketNotificationBetweenClients
  'deleteFriendMatchRequest': (message : {sender:string, receiver:string}) => void;

  /**
   * Event for notify the player about a new friend match request
   */
  'friendMatchRequest': (message : {sender:string, receiver:string})=> void;

  /**
   * Event for notify the player about a new game
   */
  'newMatch': (otherUsername: string) => void;

  /**
   * Event for notify the two players of that match that something new happened in that match
   */
  // 'match': (match_id: mongoose.Schema.Types.ObjectId) => void;

  /**
   * Event for notify the players, and eventually the observers, of a match about the chat of the match
   */
  'matchChat': (message: ToClientMatchMessage)=> void;

  /**
   * Event for notify the clients about a random match request
   *  (This event it's used only to notify the other sockets of the same player that made the request)
   */
  'randomMatchRequest': () => void;
}