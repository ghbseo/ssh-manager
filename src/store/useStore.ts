import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { api } from "@/lib/tauri";
import type { Group, Profile, Settings, Store } from "@/lib/types";

const defaultSettings: Settings = {
  terminalPath: "",
  terminalArgsTemplate:
    'new-tab --title "{name}" ssh {user}@{host} -p {port} {keyArg} {sshArgs}',
  defaultSshArgs: "",
  theme: "system",
};

const emptyStore: Store = {
  profiles: [],
  groups: [],
  settings: defaultSettings,
  version: 1,
};

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type AppState = {
  hydrated: boolean;
  profiles: Profile[];
  groups: Group[];
  settings: Settings;

  load: () => Promise<void>;
  persist: () => Promise<void>;

  upsertProfile: (p: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  moveProfile: (id: string, groupId: string | null) => Promise<void>;

  upsertGroup: (g: Group) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  toggleGroupExpanded: (id: string) => Promise<void>;

  updateSettings: (patch: Partial<Settings>) => Promise<void>;

  newProfileDraft: (groupId?: string | null) => Profile;
  newGroupDraft: (parentId?: string | null) => Group;
};

export const useStore = create<AppState>((set, get) => ({
  hydrated: false,
  ...emptyStore,

  load: async () => {
    if (!isTauri) {
      set({ ...emptyStore, hydrated: true });
      return;
    }
    try {
      const s = await api.loadStore();
      set({
        profiles: s.profiles ?? [],
        groups: s.groups ?? [],
        settings: { ...defaultSettings, ...(s.settings ?? {}) },
        hydrated: true,
      });
    } catch (err) {
      console.error("load_store failed:", err);
      set({ ...emptyStore, hydrated: true });
    }
  },

  persist: async () => {
    if (!isTauri) return;
    const { profiles, groups, settings } = get();
    await api.saveStore({ profiles, groups, settings, version: 1 });
  },

  upsertProfile: async (p) => {
    const now = new Date().toISOString();
    const existing = get().profiles.find((x) => x.id === p.id);
    const next: Profile = {
      ...p,
      createdAt: existing?.createdAt ?? p.createdAt ?? now,
      updatedAt: now,
    };
    set((st) => {
      const idx = st.profiles.findIndex((x) => x.id === next.id);
      const profiles = [...st.profiles];
      if (idx >= 0) profiles[idx] = next;
      else profiles.push(next);
      return { profiles };
    });
    await get().persist();
  },

  deleteProfile: async (id) => {
    set((st) => ({ profiles: st.profiles.filter((p) => p.id !== id) }));
    if (isTauri) {
      try {
        await api.deleteProfileSecret(id, "password");
      } catch {}
      try {
        await api.deleteProfileSecret(id, "passphrase");
      } catch {}
    }
    await get().persist();
  },

  toggleFavorite: async (id) => {
    set((st) => ({
      profiles: st.profiles.map((p) =>
        p.id === id ? { ...p, favorite: !p.favorite } : p,
      ),
    }));
    await get().persist();
  },

  moveProfile: async (id, groupId) => {
    set((st) => ({
      profiles: st.profiles.map((p) => (p.id === id ? { ...p, groupId } : p)),
    }));
    await get().persist();
  },

  upsertGroup: async (g) => {
    set((st) => {
      const idx = st.groups.findIndex((x) => x.id === g.id);
      const groups = [...st.groups];
      if (idx >= 0) groups[idx] = g;
      else groups.push(g);
      return { groups };
    });
    await get().persist();
  },

  deleteGroup: async (id) => {
    set((st) => ({
      groups: st.groups.filter((g) => g.id !== id),
      profiles: st.profiles.map((p) =>
        p.groupId === id ? { ...p, groupId: null } : p,
      ),
    }));
    await get().persist();
  },

  toggleGroupExpanded: async (id) => {
    set((st) => ({
      groups: st.groups.map((g) =>
        g.id === id ? { ...g, expanded: !g.expanded } : g,
      ),
    }));
    await get().persist();
  },

  updateSettings: async (patch) => {
    set((st) => ({ settings: { ...st.settings, ...patch } }));
    await get().persist();
  },

  newProfileDraft: (groupId = null) => {
    const now = new Date().toISOString();
    return {
      id: uuid(),
      name: "",
      host: "",
      port: 22,
      user: "",
      authType: "key",
      keyPath: undefined,
      hasSecret: false,
      groupId: groupId ?? null,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  newGroupDraft: (parentId = null) => ({
    id: uuid(),
    name: "새 폴더",
    parentId: parentId ?? null,
    expanded: true,
  }),
}));
