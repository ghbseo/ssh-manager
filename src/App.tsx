import { useEffect, useMemo, useState } from "react";
import {
  Settings as SettingsIcon,
  Search,
  Terminal,
  X,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { v4 as uuid } from "uuid";
import { useStore } from "@/store/useStore";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ProfileTree } from "@/components/ProfileTree";
import { ProfileForm } from "@/components/ProfileForm";
import { CommandPalette } from "@/components/CommandPalette";
import { FavoritesBar } from "@/components/FavoritesBar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TerminalView } from "@/components/TerminalView";
import { Button } from "@/components/ui/button";
import type { Profile, Settings } from "@/lib/types";

type Tab = {
  id: string;
  profileId: string;
  // Snapshot so the tab still renders if the profile is edited/deleted.
  name: string;
  user: string;
  host: string;
  port: number;
};

export default function App() {
  const hydrated = useStore((s) => s.hydrated);
  const load = useStore((s) => s.load);
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  useTheme(theme);
  const profiles = useStore((s) => s.profiles);
  const newProfileDraft = useStore((s) => s.newProfileDraft);
  const upsertProfile = useStore((s) => s.upsertProfile);
  const newGroupDraft = useStore((s) => s.newGroupDraft);
  const upsertGroup = useStore((s) => s.upsertGroup);

  const nextTheme: Settings["theme"] =
    theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
  const ThemeIcon =
    theme === "system" ? Laptop : theme === "dark" ? Moon : Sun;
  const themeLabel =
    theme === "system" ? "시스템" : theme === "dark" ? "어둡게" : "밝게";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      // Ctrl+W closes the active tab.
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "w" &&
        activeTabId
      ) {
        e.preventDefault();
        closeTab(activeTabId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  const selected = useMemo<Profile | null>(() => {
    if (draft && draft.id === selectedId) return draft;
    return profiles.find((p) => p.id === selectedId) ?? null;
  }, [profiles, selectedId, draft]);

  const resolveTabProfile = (t: Tab): Profile => {
    const live = profiles.find((p) => p.id === t.profileId);
    if (live) return live;
    const now = new Date().toISOString();
    return {
      id: t.profileId,
      name: t.name,
      user: t.user,
      host: t.host,
      port: t.port,
      authType: "key",
      hasSecret: false,
      groupId: null,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
  };

  const openTerminal = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    const tab: Tab = {
      id: uuid(),
      profileId: p.id,
      name: p.name,
      user: p.user,
      host: p.host,
      port: p.port,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setSelectedId(p.id);
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const neighbor = next[idx] ?? next[idx - 1] ?? null;
        setActiveTabId(neighbor ? neighbor.id : null);
      }
      return next;
    });
  };

  const selectFromSidebar = (id: string) => {
    setSelectedId(id);
    setActiveTabId(null); // switch to editor view; tabs stay alive
  };

  const handleNewProfile = async (groupId: string | null = null) => {
    const p = newProfileDraft(groupId);
    setDraft(p);
    setSelectedId(p.id);
    setActiveTabId(null);
    await upsertProfile({ ...p, name: "새 프로필" });
    setDraft(null);
  };

  const handleNewGroup = async (parentId: string | null = null) => {
    const g = newGroupDraft(parentId);
    await upsertGroup(g);
  };

  const showTabBar = tabs.length > 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground">
      {/* Top bar (VS Code style) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-3 h-11 border-b bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-[13px] tracking-tight truncate">
            SSH 매니저
          </span>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="w-[min(560px,60vw)] h-7 flex items-center gap-2 px-3 rounded-md border border-border/70 bg-secondary/60 hover:bg-secondary transition-colors text-left"
          title="프로필 검색 (Ctrl + K)"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="flex-1 text-xs text-muted-foreground truncate">
            프로필 검색…
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] text-muted-foreground shrink-0">
            Ctrl + K
          </kbd>
        </button>

        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => void updateSettings({ theme: nextTheme })}
            title={`테마: ${themeLabel} (클릭하여 변경)`}
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setSettingsOpen(true)}
            title="설정"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <FavoritesBar
        onSelectProfile={selectFromSidebar}
        onConnectProfile={openTerminal}
      />

      {/* Main split */}
      <div className="flex flex-1 min-h-0">
        <aside className="w-72 border-r shrink-0">
          <ProfileTree
            selectedId={selectedId}
            onSelect={selectFromSidebar}
            onConnect={openTerminal}
            onNewProfile={handleNewProfile}
            onNewGroup={handleNewGroup}
          />
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          {showTabBar && (
            <div className="flex items-center border-b bg-card/40 overflow-x-auto">
              {tabs.map((t) => {
                const isActive = t.id === activeTabId;
                const p = profiles.find((x) => x.id === t.profileId);
                const name = p?.name || t.name || "(이름 없음)";
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTabId(t.id)}
                    className={cn(
                      "group relative flex items-center gap-2 px-3 h-9 border-r cursor-pointer select-none shrink-0",
                      isActive
                        ? "bg-background text-foreground"
                        : "bg-transparent text-muted-foreground hover:bg-accent/50",
                    )}
                    title={`${t.user}@${t.host}:${t.port}`}
                  >
                    <Terminal
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="text-sm max-w-[160px] truncate">
                      {name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(t.id);
                      }}
                      className="p-0.5 rounded hover:bg-muted opacity-40 group-hover:opacity-100 transition-opacity"
                      title="탭 닫기"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex-1 min-h-0 relative">
            {/* Terminal tabs — stay mounted so sessions survive tab switches */}
            {tabs.map((t) => {
              const isActive = t.id === activeTabId;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "absolute inset-0",
                    !isActive && "invisible pointer-events-none",
                  )}
                >
                  <TerminalView
                    profile={resolveTabProfile(t)}
                    onExit={() => closeTab(t.id)}
                  />
                </div>
              );
            })}

            {/* Editor / empty state when no tab is active */}
            {activeTabId == null &&
              (!hydrated ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  불러오는 중…
                </div>
              ) : selected ? (
                <ProfileForm
                  key={selected.id}
                  profile={selected}
                  onSaved={(id) => setSelectedId(id)}
                  onConnect={openTerminal}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
                  <Terminal className="h-10 w-10 opacity-40" />
                  <p className="text-[15px]">
                    사이드바에서 프로필을 선택하거나 새로 만드세요.
                  </p>
                  <p className="text-xs">
                    빠른 검색:{" "}
                    <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[11px]">
                      Ctrl + K
                    </kbd>
                  </p>
                </div>
              ))}
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSelectProfile={selectFromSidebar}
        onConnectProfile={openTerminal}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
