import { PlayerDocument, PlayerType } from "../models/Player";

export function ensureNotFirstAccessModerator(playerDocument: PlayerDocument): void{
  if (playerDocument.type === PlayerType.MODERATOR_FIRST_ACCESS) {
    console.warn('A first access moderator tried to perform an unauthorized operation, user: ' + playerDocument.username);
    throw new Error('You have to confirm your profile first'); 
  }
}