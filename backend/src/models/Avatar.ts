import mongoose = require('mongoose');

export interface Avatar {
  image: Buffer,
}

export interface AvatarDocument extends Avatar, mongoose.Document {
}

export interface AvatarModel extends mongoose.Model<AvatarDocument> {
}


const avatarSchema = new mongoose.Schema<AvatarDocument, AvatarModel>({
  image: {
    type: mongoose.SchemaTypes.Buffer,
    required: true,
  },
}, { timestamps: true });


export function getSchema() {
  return avatarSchema;
}

// Mongoose Model
let avatarModel: AvatarModel;  // This is not exposed outside the model
export function getModel(): AvatarModel { // Return Model as singleton
  if (!avatarModel) {
    avatarModel = mongoose.model<AvatarDocument, AvatarModel>('Avatar', getSchema())
  }
  return avatarModel;
}


export interface NewAvatarParams {
  image: Buffer,
}


export function newAvatar(data: NewAvatarParams): AvatarDocument {
  const _avatarModel = getModel();

  const avatar: Avatar = {
    image: data.image,
  };
  return new _avatarModel(avatar);
}
