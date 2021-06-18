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

}
