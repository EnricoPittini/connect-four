import mongoose = require('mongoose');

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
   * Event for notify the player about a match request deletion (both canceled and rejected)
   */
  // TODO il tipo si può isolare, con nome SocketNotificationBetweenClients
  'deleteMatchRequest': (message : {sender:string, receiver:string}) => void; 

  /**
   * Event for notify the player about a new match request 
   */
  'matchRequest': (message : {sender:string, receiver:string})=> void;

  /**
   * Event for notify the player about a new game
   */
  'newMatch': (otherUsername: string) => void;

  /**
   * Event for notify the two players of that match that something new happened in that match
   */
  'match': (match_id: mongoose.Schema.Types.ObjectId) => void;

  'matchChat': (message: ToClientMatchMessage)=> void;
}
