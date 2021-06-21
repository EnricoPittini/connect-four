/**
 * Represents the message, sent by a Client to one of his friends, that the Server forwards to the Clients
 */
export interface ToClientFriendMessage {
  from : string,
  to : string,
  text: string,
  datetime: Date,
}

/**
 * Represents the message, sent by a Client to a match chat, that the Server forwards to the Clients
 */
export interface ToClientMatchMessage{
  matchId: string,
  from : string,
  text: string,
  datetime: Date,
}

/**
 * Events emitted from the server.
 */
export default interface ServerEvents {

  /**
   * The Server notifies the Client sockets that one of his friend is now offline
   */
  'friendOffline': (username: string) => void;

  /**
   * The Server notifies the Client sockets that one of his friend is now online
   */
  'friendOnline': (username: string) => void;

  /**
   * The Server notifies the Client sockets about a new friend request
   */
  'newFriendRequest': (username: string) => void;

  /**
   * The Server notifies the Client sockets about a new friend
   */
  'newFriend': (username: string) => void;

  /**
   * The Server notifies the Client sockets about a friend request cancelation (both rejected and canceled)
   */
  'cancelFriendRequest': (username: string) => void;

  /**
   * The Server notifies the Client sockets that one of his friend doesn't exist anymore
   */
  'lostFriend': (username: string) => void;

  /**
   * The Server notifies the Clients (both sender and receiver) sockets about a new message
   */
  'chat': (message: ToClientFriendMessage) => void;

  /**
   * The Server notifies the Clients (both sender and receiver) sockets about a friend match request deletion (both canceled and rejected)
   */
  // TODO il tipo si può isolare, con nome SocketNotificationBetweenClients
  'deleteFriendMatchRequest': (message : {sender:string, receiver:string}) => void;

  /**
   * The Server notifies the Clients (both sender and receiver) sockets about a new friend match request
   */
  // TODO il tipo si può isolare, con nome SocketNotificationBetweenClients
  'friendMatchRequest': (message : {sender:string, receiver:string})=> void;

  /**
   * The Server notifies the Clients (both the players of the match) sockets about a new match
   */
  'newMatch': (matchId: string) => void;

  /**
   * The Server notifies the Clients (the players and the observers of the match) sockets that something new happened
   * in that match
   */
  'match': (matchId: string) => void;

  /**
   * The Server notifies the Clients (the players and, eventually, the observers of the match) sockets that something
   * about a new message in the chat
   */
  'matchChat': (message: ToClientMatchMessage)=> void;

  /**
   * The Server notifies the Client (the one that did the random match request) sockets that a random match request
   *  has just been made.
   * (This event it's used only to notify the other sockets of the same player that made the request)
   */
  'randomMatchRequest': () => void;

  /**
   * The Server notifies the Client (the one that did the random match request) sockets that a random match request
   *  has just been canceled.
   * (This event it's used only to notify the other sockets of the same player that made the request)
   */
  'cancelRandomMatchRequest': () => void;

  /**
   * The Server answers the Client sockets to his question about the existence of a random match request made by himself
   */
  'hasRandomMatchRequest': (flag: boolean) => void;

  /**
   * The Server notifies the Client sockets about his profile deletion
   */
  'profileDeleted': ()=> void;
}
