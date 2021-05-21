import mongoose = require('mongoose');
import crypto = require('crypto');


function hashPassword(pwd: string): { digest: string, salt: string } {
  // TODO da implementare
  return {
    digest: '',
    salt: '',
  };
}


export enum PlayerType {
  PLAYER = 'PLAYER',
  MODERATOR = 'MODERATOR',
  MODERATOR_FIRST_ACCESS = 'MODERATOR_FIRST_ACCESS',
}

export interface Player extends mongoose.Document {
  username: string,
  name: string,
  surname: string,
  avatar: string,     // TODO da capire come gestire
  type: PlayerType,
  friends: string[],
  digest: string,     // this is the hashed password (digest of the password)
  salt: string,       // salt is a random string that will be mixed with the actual password before hashing

  validatePassword: (pwd: string) => boolean,
  confirmModerator: (name: string, surname: string, avatar: string, pwd: string) => void,

  // TODO valutare utilizzo eccezioni
  addFriend: (friendUsername: string) => boolean,
  removeFriend: (friendUsername: string) => boolean,
  hasFriend: (friendUsername: string) => boolean,
}


const playerSchema = new mongoose.Schema({
  _id: false,         // TODO testare
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
});


playerSchema.methods.validatePassword = function(this: any /* TODO togliere */, pwd: string): boolean {
  // TODO mettere apposto i tipi

  // To validate the password, we compute the digest with the
  // same HMAC to check if it matches with the digest we stored
  // in the database.

  const hmac = crypto.createHmac('sha512', this.salt);
  hmac.update(pwd);
  const digest = hmac.digest('hex');
  return (this.digest === digest);
}

playerSchema.methods.confirmModerator = function(this: any /* TODO togliere */,
                                                 name: string,
                                                 surname: string,
                                                 avatar: string,
                                                 pwd: string): void {

  this.name = name;
  this.surname = surname;
  this.avatar = avatar;

  const { digest, salt } = hashPassword(pwd);
  this.digest = digest;
  this.salt = salt;
}

/**
 *
 * @param friendUsername - the username of the friend to add, must be an existing username
 * @returns
 */
playerSchema.methods.addFriend = function(this: any /* TODO togliere */, friendUsername: string): boolean {
  // TODO sistemare tipi
  if (this.username === friendUsername || this.hasFriend(friendUsername)) {
    // friendUsername is your username or already in the friend list
    return false;
  }

  (this.friends as string[]).push(friendUsername);
  return true;
}


/**
 *
 * @param friendUsername - the username of the friend to remove
 * @returns
 */
playerSchema.methods.removeFriend = function(this: any /* TODO togliere */, friendUsername: string): boolean {
  // TODO sistemare tipi
  if (!this.hasFriend(friendUsername)) {
    // not in the friend list
    return false;
  }

  this.friends = (this.friends as string[]).filter(item => item !== friendUsername);
  return true;
}

/**
 *
 * @param friendUsername - the username of the friend
 * @returns
 */
playerSchema.methods.hasFriend = function(this: any /* TODO togliere */, friendUsername: string): boolean {
  // TODO sistemare tipi
  return !!(this.friends as string[]).find(item => item === friendUsername);
}



export function getSchema() {
  return playerSchema;
}

// Mongoose Model
let playerModel: mongoose.Model<Player>;  // This is not exposed outside the model
export function getModel(): mongoose.Model<Player> { // Return Model as singleton
  if(!playerModel) {
    playerModel = mongoose.model('Player', getSchema())
  }
  return playerModel;
}

export function newPlayer(data: any): Player {
  var _playerModel = getModel();
  var player = new _playerModel( data );

  return player;
}
