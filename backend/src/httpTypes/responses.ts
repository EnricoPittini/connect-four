import { ClientPlayer } from '../models/Player';
import { Stats } from '../models/Stats';

export interface ResponseBody {
  error: boolean,
  statusCode: number,
}

export interface SuccessResponseBody extends ResponseBody {
  error: false,
}

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
  player: ClientPlayer & { online: boolean, playing: boolean },
}

export interface GetPlayerStatsResponseBody extends SuccessResponseBody {
  stats: Stats,
}

export interface GetFriendsResponseBody extends SuccessResponseBody {
  friends: string[],
}
