export type HangoutGame = {
  id: string;
  title: string;
  tagline: string;
  description: string;
};

export type HangoutLobbyMember = {
  playerId: string;
  playerName: string;
  isHost: boolean;
};

export type HangoutRoundState = {
  id: string;
  status: "active" | "revealed";
  createdAt: string;
  reveal?: {
    mainQuestion: string;
    differentQuestion: string;
    differentPlayerName: string;
  };
};

export type HangoutLobbyState = {
  lobby: null | {
    id: string;
    gameType: string;
    status: "waiting" | "active" | "revealed";
    hostPlayerId: string;
    members: HangoutLobbyMember[];
    currentRound: HangoutRoundState | null;
    createdAt: string;
  };
  viewer: {
    isMember: boolean;
    isHost: boolean;
    canJoin: boolean;
    canLeave: boolean;
  };
};

export const hangoutGames: HangoutGame[] = [
  {
    id: "crossed-wires",
    title: "One Question Off",
    tagline: "Same conversation. One different question.",
    description: "Check your private prompt, put the phone down, and work out whose answer came from somewhere else.",
  },
];
