import mongoose = require('mongoose');
import crypto = require('crypto');

import stats = require('./Stats');
import { StatsDocument } from './Stats';

import avatar = require('./Avatar');


/**
 * Given a plain text password, returns the digest of that password with the salt used in the encryption
 * @param pwd
 * @returns
 */
function hashPassword(pwd: string): { digest: string, salt: string } {

  const salt = crypto.randomBytes(16).toString('hex'); // We use a random 16-bytes hex string for salt

  // We use the hash function sha512 to hash both the password and salt to
  // obtain a password digest
  //
  // From wikipedia: (https://en.wikipedia.org/wiki/HMAC)
  // In cryptography, an HMAC (sometimes disabbreviated as either keyed-hash message
  // authentication code or hash-based message authentication code) is a specific type
  // of message authentication code (MAC) involving a cryptographic hash function and
  // a secret cryptographic key.

  const hmac = crypto.createHmac('sha512', salt);
  hmac.update(pwd);
  const digest = hmac.digest('hex'); // The final digest depends both by the password and the salt

  return {
    digest: digest,
    salt: salt,
  };
}


export enum PlayerType {
  STANDARD_PLAYER = 'STANDARD_PLAYER',
  MODERATOR = 'MODERATOR',
  MODERATOR_FIRST_ACCESS = 'MODERATOR_FIRST_ACCESS',
}

/**
 * Represents the player accessible by the Client-side
 */
export interface ClientPlayer {
  username: string,
  name: string,
  surname: string,
  type: PlayerType,
}

/**
 * Represents the actual player
 */
export interface Player extends ClientPlayer {
  avatar: string,
  friends: string[],
  digest: string,     // this is the hashed password (digest of the password)
  salt: string,       // salt is a random string that will be mixed with the actual password before hashing
  stats: StatsDocument['_id'],
}

/**
 * Represents a player document (i.e. a player memorized in the database)
 */
export interface PlayerDocument extends Player, mongoose.Document {
  validatePassword: (pwd: string) => boolean,
  confirmModerator: (name: string, surname: string, pwd: string) => void,

  addFriend: (friendUsername: string) => boolean,
  removeFriend: (friendUsername: string) => boolean,
  hasFriend: (friendUsername: string) => boolean,
  getStats: () => StatsDocument,
}

export interface PlayerModel extends mongoose.Model<PlayerDocument> {
}


const playerSchema = new mongoose.Schema<PlayerDocument, PlayerModel>({
  username: {
    type: mongoose.SchemaTypes.String,
    required: true,
    unique: true,
  },
  name: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  surname: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  avatar: {     // TODO da capire come gestire
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  type: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  friends: {
    type: [mongoose.SchemaTypes.String],
    required: true,
  },
  digest: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  salt: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  stats: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
  },
});


/**
 * Given a plain text password, checks if it's the correct password of the player
 * @param pwd
 * @returns
 */
playerSchema.methods.validatePassword = function (pwd: string): boolean {
  // To validate the password, we compute the digest with the
  // same HMAC to check if it matches with the digest we stored
  // in the database.

  const hmac = crypto.createHmac('sha512', this.salt);
  hmac.update(pwd);
  const digest = hmac.digest('hex');
  return (this.digest === digest);
}

/**
 * Updates a moderator first access profile, usign the given data.
 * @param name
 * @param surname
 * @param pwd
 */
playerSchema.methods.confirmModerator = function (name: string,
                                                  surname: string,
                                                  pwd: string): void {

  this.name = name;
  this.surname = surname;
  this.type = PlayerType.MODERATOR;

  const { digest, salt } = hashPassword(pwd);
  this.digest = digest;
  this.salt = salt;
}

/**
 * Adds a friend to that player
 * @param friendUsername - the username of the friend to add, must be an existing username
 * @returns
 */
playerSchema.methods.addFriend = function (friendUsername: string): boolean {
  if (this.username === friendUsername || this.hasFriend(friendUsername)) {
    // friendUsername is your username or already in the friend list
    return false;
  }

  this.friends.push(friendUsername);
  return true;
}


/**
 * Remove a friend from that player
 * @param friendUsername - the username of the friend to remove
 * @returns
 */
playerSchema.methods.removeFriend = function (friendUsername: string): boolean {
  if (!this.hasFriend(friendUsername)) {
    // not in the friend list
    return false;
  }

  this.friends = this.friends.filter(item => item !== friendUsername);
  return true;
}

/**
 * Checks if that player has the specified friends
 * @param friendUsername - the username of the friend
 * @returns
 */
playerSchema.methods.hasFriend = function (friendUsername: string): boolean {
  return !!this.friends.find(item => item === friendUsername);
}

/**
 * Returns the stats document of that player
 * @returns
 */
playerSchema.methods.getStats = function (): Promise<StatsDocument> {
  // Cast to Promise<StatsDocument> because we are sure that the StatsDocument exists
  return stats.getModel().findOne({ _id: this.stats }).exec() as Promise<StatsDocument>;
}



export function getSchema() {
  return playerSchema;
}

// Mongoose Model
let playerModel: PlayerModel;  // This is not exposed outside the model
export function getModel(): PlayerModel { // Return Model as singleton
  if (!playerModel) {
    playerModel = mongoose.model<PlayerDocument, PlayerModel>('Player', getSchema())
  }
  return playerModel;
}


/**
 * Represents the type of the input data needed to create a new standard player document
 */
export interface NewStandardPlayerParams extends Pick<Player, 'username' | 'name' | 'surname'> {
  password: string,
}

/**
 * Creates a new standard player document
 * @param data
 * @returns
 */
export function newStandardPlayer(data: NewStandardPlayerParams): Promise<PlayerDocument> {
  const _playerModel = getModel();

  const { digest, salt } = hashPassword(data.password);

  // Creates also the stats document associated to that player
  const statsDocument: StatsDocument = stats.newStats({
    player: data.username,
  });

  return statsDocument.save()
    .then(() => {
      // Retrieve default avatar id
      return avatar.getModel().findOne().sort({ createdAt: 1 });
    })
    .then((defaultAvatar) => {
      const player: Player = {
        username: data.username,
        name: data.name,
        surname: data.surname,
        avatar: defaultAvatar!['_id'].toString(),
        type: PlayerType.STANDARD_PLAYER,
        friends: [],
        digest: digest,
        salt: salt,
        stats: statsDocument['_id'],
      };
      return new _playerModel(player);
    });
}

/**
 * Represents the type of the input data needed to create a new moderator document
 */
export interface NewModeratorParams extends Pick<Player, 'username'> {
  password: string,
}

/**
 * Creates a new moderator document
 * @param data
 * @returns
 */
export function newModerator(data: NewModeratorParams): Promise<PlayerDocument> {
  const _playerModel = getModel();

  const { digest, salt } = hashPassword(data.password);

  // Creates also the stats document associated to that moderator
  const statsDocument: StatsDocument = stats.newStats({
    player: data.username,
  });

  return statsDocument.save()
    .then(() => {
      // Retrieve default avatar id
      return avatar.getModel().findOne().sort({ createdAt: 1 });
    })
    .then((defaultAvatar) => {
      const player: Player = {
        username: data.username,
        name: 'TempName',
        surname: 'TempSurname',
        avatar: defaultAvatar!['_id'].toString(),
        type: PlayerType.MODERATOR_FIRST_ACCESS,
        friends: [],
        digest: digest,
        salt: salt,
        stats: statsDocument['_id'],
      };
      return new _playerModel(player);
    });
}
