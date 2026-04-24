import { invoke } from "@tauri-apps/api/core";
import type {
  Profile,
  SecretKind,
  Store,
  TerminalCandidate,
} from "./types";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    return Promise.reject(new Error("Tauri runtime not available"));
  }
  return invoke<T>(cmd, args);
}

export const api = {
  loadStore: () => call<Store>("load_store"),
  saveStore: (store: Store) => call<void>("save_store", { store }),
  upsertProfile: (profile: Profile) =>
    call<void>("upsert_profile", { profile }),
  deleteProfile: (id: string) => call<void>("delete_profile", { id }),
  setProfileSecret: (id: string, kind: SecretKind, value: string) =>
    call<void>("set_profile_secret", { id, kind, value }),
  deleteProfileSecret: (id: string, kind: SecretKind) =>
    call<void>("delete_profile_secret", { id, kind }),
  hasProfileSecret: (id: string, kind: SecretKind) =>
    call<boolean>("has_profile_secret", { id, kind }),
  connectProfile: (id: string) => call<void>("connect_profile", { id }),
  detectTerminals: () =>
    isTauri
      ? call<TerminalCandidate[]>("detect_terminals")
      : Promise.resolve([]),

  ptyOpen: (
    sessionId: string,
    profileId: string,
    cols: number,
    rows: number,
  ) => call<void>("pty_open", { sessionId, profileId, cols, rows }),
  ptyWrite: (sessionId: string, dataB64: string) =>
    call<void>("pty_write", { sessionId, dataB64 }),
  ptyResize: (sessionId: string, cols: number, rows: number) =>
    call<void>("pty_resize", { sessionId, cols, rows }),
  ptyClose: (sessionId: string) =>
    call<void>("pty_close", { sessionId }),
};
