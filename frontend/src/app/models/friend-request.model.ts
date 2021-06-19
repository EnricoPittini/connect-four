export interface FriendRequest {
  from: string,
  to: string,
  datetime: Date,
}

interface NewFriendRequestParams extends Pick<FriendRequest, 'from' | 'to'> {
}
