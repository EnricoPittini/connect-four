/**
 * Represents the match requests between two friends.
 * (The other category of match requests is the random match requests)
 */
interface FriendMatchRequest {
  from: string,
  to: string,
  datetime: Date,
}