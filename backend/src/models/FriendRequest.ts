import mongoose = require('mongoose');

export interface FriendRequest {
  from: string,
  to: string,
  datetime: Date,
}

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

interface NewFriendRequestParams extends Pick<FriendRequest, 'from' | 'to'> {
}

export function newFriendRequest(data: NewFriendRequestParams): FriendRequestDocument {
  const _friendRequestModel = getModel();

  const friendRequest: FriendRequest = {
    from: data.from,
    to: data.to,
    datetime: new Date(),
  };

  return new _friendRequestModel(friendRequest);
}
