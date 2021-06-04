import mongoose = require('mongoose');

enum SenderPlayer{
  PLAYER_A = "PLAYER_A",
  PLAYER_B = "PLAYER_B",
}

export interface Message{
    sender: SenderPlayer,
    text: string,
    datetime: Date,
}

// TODO ricontrollare tipi per sub documents
const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    text: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    datetime: {
        type: mongoose.SchemaTypes.Date,
        required: true,
    },
});


export interface Chat{
    playerA : string,
    playerB : string,
    messages : Message[],
    playerAHasNewMessages : boolean,
    playerBHasNewMessages : boolean,
}

export interface ChatDocument extends Chat, mongoose.Document {
  addMessage: (senderUsername: string, text: string) => void,
}

export interface ChatModel extends mongoose.Model<ChatDocument> {
}

const chatSchema = new mongoose.Schema<ChatDocument, ChatModel>({
  playerA: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  playerB: {
      type: mongoose.SchemaTypes.String,
      required: true,
  },
  messages: {
      type: [messageSchema],
      required: true,
  },
  playerAHasNewMessages: {
    type: mongoose.SchemaTypes.Boolean,
    required: true,
  },
  playerBHasNewMessages: {
    type: mongoose.SchemaTypes.Boolean,
    required: true,
  },
});

chatSchema.methods.addMessage = function(senderUsername: string, text: string): boolean {
  let sender : SenderPlayer;

  if(senderUsername===this.playerA){
    sender = SenderPlayer.PLAYER_A;
  }
  else if(senderUsername===this.playerB){
    sender = SenderPlayer.PLAYER_B;
  }
  else{
    return false;
  }

  const message : Message = {
    sender: sender,
    text: text,
    datetime: new Date(),
  }

  this.messages.push(message);

  // TODO attenzione al fatto che ogni volta che è aggiunto un messaggio è messo che il destinatario ha nuovi messaggi
  if(sender===SenderPlayer.PLAYER_A){
    this.playerBHasNewMessages = true;
  }
  else{
    this.playerAHasNewMessages = true;
  }

  return true;
}

export function getSchema() {
  return chatSchema;
}

// Mongoose Model
let chatModel: ChatModel;  // This is not exposed outside the model
export function getModel(): ChatModel { // Return Model as singleton
  if(!chatModel) {
    chatModel = mongoose.model<ChatDocument, ChatModel>('Chat', getSchema())
  }
  return chatModel;
}

interface NewChatParams extends Pick< Chat, 'playerA' | 'playerB'>{
}

export function newChat(data: NewChatParams): ChatDocument {
  const _chatModel = getModel();

  const chat: Chat = {
    playerA: data.playerA,
    playerB: data.playerB,
    messages: [],
    playerAHasNewMessages: false,
    playerBHasNewMessages: false,
  };

  return new _chatModel(chat);
}