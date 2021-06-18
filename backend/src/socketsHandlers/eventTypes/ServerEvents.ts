/**
 * Events emitted from the server.
 */
export default interface ServerEvents {

  'friendOffline': (username: string) => void;
  'friendOnline': (username: string) => void;

}
