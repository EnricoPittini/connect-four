/**
 * Events emitted from the clients.
 */
export default interface ClientEvents {

  'online': (jwtToken: string) => void;

}
