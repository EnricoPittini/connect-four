export enum PlayerType {
  STANDARD_PLAYER = 'STANDARD_PLAYER',
  MODERATOR = 'MODERATOR',
  MODERATOR_FIRST_ACCESS = 'MODERATOR_FIRST_ACCESS',
}

export interface ClientPlayer {
  username: string,
  name: string,
  surname: string,
  type: PlayerType,
}

export interface Player extends ClientPlayer {
  avatar: string,     
  friends: string[],
  digest: string,     // this is the hashed password (digest of the password)
  salt: string,       // salt is a random string that will be mixed with the actual password before hashing
  stats: string,
}

export interface NewStandardPlayerParams extends Pick<Player, 'username' | 'name' | 'surname'> {
  password: string,
}

export interface NewModeratorParams extends Pick<Player, 'username'> {
  password: string,
}
