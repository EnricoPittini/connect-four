import mongoose = require('mongoose');

/**
 * Represents the friend requests
 */
export interface FriendRequest {
  from: string,
  to: string,
  datetime: Date,
}

/**
 * Represents the friend requests documents (i.e. the friend requests stored in the database)
 */
export interface FriendRequestDocument extends FriendRequest, mongoose.Document {
}

export interface FriendRequestModel extends mongoose.Model<FriendRequestDocument> {
}

const friendRequestSchema = new mongoose.Schema<FriendRequestDocument, FriendRequestModel>({
  from: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  to: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  datetime: {
    type: mongoose.SchemaTypes.Date,
    required: true,
  },
});


export function getSchema() {
  return friendRequestSchema;
}

// Mongoose Model
let friendRequestModel: FriendRequestModel;  // This is not exposed outside the model
export function getModel(): FriendRequestModel { // Return Model as singleton
  if (!friendRequestModel) {
    friendRequestModel = mongoose.model<FriendRequestDocument, FriendRequestModel>('FriendRequest', getSchema())
  }
  return friendRequestModel;
}

/**
 * Represents the type of the input data needed to create a new friend request document
 */
interface NewFriendRequestParams extends Pick<FriendRequest, 'from' | 'to'> {
}

/**
 * Creates a new friend request document
 * @param data 
 * @returns 
 */
export function newFriendRequest(data: NewFriendRequestParams): FriendRequestDocument {
  const _friendRequestModel = getModel();

  const friendRequest: FriendRequest = {
    from: data.from,
    to: data.to,
    datetime: new Date(),
  };

  return new _friendRequestModel(friendRequest);
}
