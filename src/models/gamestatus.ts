// Game Status definitions

// Lobby that players can join
export type Lobby = 'LOBBY';

// Lobby launched into game. Players are viewing splash
export type Pregame = 'PREGAME';

// Game has started
export type Ingame = 'INGAME';

// Game has ended
export type Ended = 'ENDED';

// Game was closed by an administrator prematurely
export type ClosedByAdmin = 'CLOSED_ADMIN';

// Game was closed by owner prematurely
export type ClosedByOwner = 'CLOSED_OWNER';

// Any of the above (union)
export type Any = Lobby | Pregame | Ingame | Ended | ClosedByOwner | ClosedByAdmin;
