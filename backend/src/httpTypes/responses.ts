// Interfaces for the HTTP responses

import { ClientPlayer } from '../models/Player';
import { Stats } from '../models/Stats';
import { FriendRequest } from '../models/FriendRequest';
import { Chat } from '../models/Chat';
import { Match } from '../models/Match';
import { FriendMatchRequest } from '../models/FriendMatchRequest';

/**
 * Represents a generic response
 */
export interface ResponseBody {
  error: boolean,
  statusCode: number,
}

/**
 * Represents a generic success response
 */
export interface SuccessResponseBody extends ResponseBody {
  error: false,
}

/**
 * Represents an error response
 */
export interface ErrorResponseBody extends ResponseBody {
  error: true,
  errorMessage: string,
}

export interface RootResponseBody extends SuccessResponseBody {
  apiVersion: string,
  endpoints: string[],
}

export interface LoginResponseBody extends SuccessResponseBody {
  token: string,
}

export interface RegistrationResponseBody extends SuccessResponseBody {
  token: string,
}

export interface GetPlayersResponseBody extends SuccessResponseBody {
  players: ClientPlayer[],
}

export interface ConfirmModeratorResponseBody extends SuccessResponseBody {
  token: string,
}

export interface GetPlayerResponseBody extends SuccessResponseBody {
  player: ClientPlayer & { online: boolean, ingame: boolean },
}

export interface GetMatchRequestInformationResponseBody extends SuccessResponseBody,FriendMatchRequest{
}

export interface GetPlayerStatsResponseBody extends SuccessResponseBody {
  stats: Stats,
}

export interface GetFriendsResponseBody extends SuccessResponseBody {
  friends: string[],
}

export interface GetFriendRequestsResponseBody extends SuccessResponseBody {
  friendRequests: FriendRequest[],
}

export interface NotifyAvailabilityFriendRequestResponseBody extends SuccessResponseBody {
  newFriend: boolean,
}

interface ChatInfo {
  playerA: string,
  playerB: string,
  playerAHasNewMessages: boolean,
  playerBHasNewMessages: boolean,
}

export interface GetChatsResponseBody extends SuccessResponseBody {
  chats: ChatInfo[],
}

export interface GetChatResponseBody extends SuccessResponseBody {
  chat: Chat,
}

export interface GetMatchesResponseBody extends SuccessResponseBody {
  matches: (Match & { _id: string })[],
}

export interface GetMatchResponseBody extends SuccessResponseBody {
  match: Match & { _id: string },
}
