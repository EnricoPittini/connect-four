import { TransientDataHandler, RandomMatchArrangement } from './TransientDataHandler';

import player = require('./models/Player');
import match = require('./models/Match');
import { NewMatchParams, MatchDocument } from './models/Match';

/**
 * Function that arranges the random match requests till now made
 */
export async function arrangeRandomMatchRequests(){
  console.info('Arranging the random match requests');

  try{
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
    const matchDocuments = await Promise.all(promises);

    // For each new match, I have to do several actions
    for(let matchDocument of matchDocuments){
      // The two players of the match
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

      // Notify player1 friends (all the sockets) that his friend is now in game 
      const player1Document = await player.getModel().findOne({ username: player1 }, { friends: 1 }).exec();
      if (!player1Document) {
        throw new Error('An invalid player did a random friend request, username: ' + player1);
      }
      for (let friendUsername of player1Document.friends) {
        const friendSockets = transientDataHandler.getPlayerSockets(friendUsername);
        for (let friendSocket of friendSockets) {
          friendSocket.emit('friendIngame', player1);
          /*friendSocket.emit('deleteFriendMatchRequest', { // TODO serve?
            sender: player1,
            receiver: friendUsername,
          });*/
        }
      }

      // Notify player2 friends (all the sockets) that his friend is now in game
      const player2Document = await player.getModel().findOne({ username: player2 }, { friends: 1 }).exec();
      if (!player2Document) {
        throw new Error('An invalid player did a random friend request, username: ' + player2);
      }
      for (let friendUsername of player2Document.friends) {
        const friendSockets = transientDataHandler.getPlayerSockets(friendUsername);
        for (let friendSocket of friendSockets) {
          friendSocket.emit('friendIngame', player2);
          /*friendSocket.emit('deleteFriendMatchRequest', { // TODO serve?
            sender: player2,
            receiver: friendUsername,
          });*/
        }
      }    
    }
  }
  catch(err){
    console.error('An error occourred, err: ' + JSON.stringify(err,null,2));
    return;
  }
}
