
/*export interface FromClientMessage{
  to : string,
  text: string,
}*/

import { ClientMessage } from "../../models/Chat";

/**
 * Events emitted from the clients.
 */
export default interface ClientEvents {

  'online': (jwtToken: string) => void;

  'chat': (message: ClientMessage) => void;
}
