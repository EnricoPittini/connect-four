enum SenderPlayer {
  PLAYER_A = 'PLAYER_A',
  PLAYER_B = 'PLAYER_B',
}

export interface Message {
  sender: SenderPlayer,
  text: string,
  datetime: Date,
}

export interface Chat {
  playerA: string,
  playerB: string,
  messages: Message[],
  playerAHasNewMessages: boolean,
  playerBHasNewMessages: boolean,
}

interface NewChatParams extends Pick<Chat, 'playerA' | 'playerB'> {
}
