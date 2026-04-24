export type AuthType = "password" | "key" | "agent";

export type Profile = {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  authType: AuthType;
  keyPath?: string;
  hasSecret: boolean;
  groupId: string | null;
  favorite: boolean;
  color?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Group = {
  id: string;
  name: string;
  parentId: string | null;
  expanded: boolean;
};

export type Settings = {
  terminalPath: string;
  terminalArgsTemplate: string;
  defaultSshArgs: string;
  theme: "dark" | "light" | "system";
};

export type Store = {
  profiles: Profile[];
  groups: Group[];
  settings: Settings;
  version: 1;
};

export type TerminalCandidate = {
  name: string;
  path: string;
  argsTemplate: string;
};

export type SecretKind = "password" | "passphrase";
