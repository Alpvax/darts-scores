export type PlayerObj = { name: string; id: string };

export type Player
  = ([string, string]
  | PlayerObj);

export type PlayerList = Player[] | {
  [playerId: string]: string | Player;
};

export const getPlayerIds = (players: PlayerList): string[] =>
  (Array.isArray(players) ? players : Object.values(players))
    .map(p => typeof p === "string" ? p : getPlayerId(p));
export const getPlayerNames = (players: PlayerList): string[] =>
  Array.isArray(players) ? players.map(getPlayerName) : Object.keys(players);
export const getPlayerId = (p: Player): string => Array.isArray(p) ? p[1] : p.id;
export const getPlayerName = (p: Player): string => Array.isArray(p) ? p[0] : p.name;

export const asPlayerObj = (p: Player): PlayerObj => Array.isArray(p)
  ? { name: p[0], id: p[1] }
  : p;

export const spreadPlayer = (p: Player): [string, string] => Array.isArray(p) ? p : [p.name, p.id];
export const iterPlayers = (players: PlayerList): PlayerObj[] =>
  (Array.isArray(players) ? players : Object.entries(players))
    .map(p => Array.isArray(p)
      ? typeof p[1] === "string"
        ? { name: p[0], id: p[1] }
        : Array.isArray(p[1]) ? { name: p[1][0], id: p[1][1] } : p[1]
      : p);
