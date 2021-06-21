import { TransientDataHandler, RandomMatchArrangement } from './TransientDataHandler';

import match = require('./models/Match');
import { NewMatchParams, MatchDocument } from './models/Match';

/**
 * Function that arranges the random match requests till now made * 
 */
export function arrangeRandomMatchRequests(): void{
  const transientDataHandler = TransientDataHandler.getInstance();

  // Get the arrangments of the random match requests till now made
  const randomMatchArrangments : RandomMatchArrangement[] = transientDataHandler.getRandomMatchRequestsArrangements();

  if(randomMatchArrangments.length<=0){ // None match arrangement was done
    return;
  }

  // Create the new matches
  const promises : Promise<MatchDocument>[] = [];
  for(let randomMatchArrangment of randomMatchArrangments){
    const data : NewMatchParams = {
      player1: randomMatchArrangment.player1,
      player2: randomMatchArrangment.player2
    };
    promises.push(match.newMatch( data ).save());
  }
  Promise.all(promises).then( matchDocuments => {

    // For each new match, I have to notify the 2 players
    for(let matchDocument of matchDocuments){
      const player1 = matchDocument.player1 ;
      const player2 = matchDocument.player2 ;

      // Mark in game both the players
      transientDataHandler.markInGame(player1);
      transientDataHandler.markInGame(player2);

      // Notify player1
      const player1Sockets = transientDataHandler.getPlayerSockets(player1);
      for (let player1Socket of player1Sockets) {
        player1Socket.emit('newMatch', matchDocument._id.toString());
      }

      // Notify player2
      const player2Sockets = transientDataHandler.getPlayerSockets(player2);
      for (let player2Socket of player2Sockets) {
        player2Socket.emit('newMatch', matchDocument._id.toString());
      }

      // Deleting all the (potential) friend match requests for both players
      transientDataHandler.deletePlayerFriendMatchRequests(player1);
      transientDataHandler.deletePlayerFriendMatchRequests(player2);
    }
  });
}