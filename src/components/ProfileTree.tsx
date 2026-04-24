import { useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plug,
  Star,
  Trash2,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import type { Group, Profile } from "@/lib/types";

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConnect: (id: string) => void;
  onNewProfile: (groupId?: string | null) => void;
  onNewGroup: (parentId?: string | null) => void;
};

export function ProfileTree({
  selectedId,
  onSelect,
  onConnect,
  onNewProfile,
  onNewGroup,
}: Props) {
  const profiles = useStore((s) => s.profiles);
  const groups = useStore((s) => s.groups);
  const toggleGroupExpanded = useStore((s) => s.toggleGroupExpanded);
  const deleteProfile = useStore((s) => s.deleteProfile);
  const deleteGroup = useStore((s) => s.deleteGroup);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const { rootGroups, childGroups, profilesByGroup } = useMemo(() => {
    const rootGroups = groups.filter((g) => !g.parentId);
    const childGroups = new Map<string, Group[]>();
    for (const g of groups) {
      if (g.parentId) {
        const arr = childGroups.get(g.parentId) ?? [];
        arr.push(g);
        childGroups.set(g.parentId, arr);
      }
    }
    const profilesByGroup = new Map<string | "__root__", Profile[]>();
    for (const p of profiles) {
      const key = p.groupId ?? "__root__";
      const arr = profilesByGroup.get(key) ?? [];
      arr.push(p);
      profilesByGroup.set(key, arr);
    }
    return { rootGroups, childGroups, profilesByGroup };
  }, [groups, profiles]);

  const handleConnect = (id: string) => onConnect(id);

  const renderProfile = (p: Profile, depth: number) => (
    <div
      key={p.id}
      onClick={() => onSelect(p.id)}
      onDoubleClick={() => handleConnect(p.id)}
      className={cn(
        "group flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
        selectedId === p.id && "bg-accent",
      )}
      style={{ paddingLeft: 8 + depth * 16 }}
    >
      <Plug className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate">
        {p.name || <span className="text-muted-foreground">(이름 없음)</span>}
      </span>
      <span className="text-xs text-muted-foreground truncate hidden group-hover:inline">
        {p.user}@{p.host}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          void toggleFavorite(p.id);
        }}
        className={cn(
          "p-0.5 hover:text-yellow-400 transition-opacity",
          p.favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        title={p.favorite ? "즐겨찾기 해제" : "즐겨찾기"}
      >
        <Star
          className={cn(
            "h-3.5 w-3.5",
            p.favorite && "fill-yellow-400 text-yellow-400",
          )}
        />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`"${p.name}"을(를) 삭제할까요?`)) void deleteProfile(p.id);
        }}
        className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive"
        title="삭제"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const renderGroup = (g: Group, depth: number) => {
    const children = childGroups.get(g.id) ?? [];
    const groupProfiles = profilesByGroup.get(g.id) ?? [];
    return (
      <div key={g.id}>
        <div
          onClick={() => toggleGroupExpanded(g.id)}
          className="group flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          {g.expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {g.expanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-primary" />
          )}
          <span className="flex-1 truncate font-medium">{g.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewProfile(g.id);
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100"
            title="이 폴더에 새 프로필"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm(
                  `폴더 "${g.name}"을(를) 삭제할까요? 안의 프로필은 최상위로 이동합니다.`,
                )
              )
                void deleteGroup(g.id);
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive"
            title="폴더 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {g.expanded && (
          <>
            {children.map((c) => renderGroup(c, depth + 1))}
            {groupProfiles.map((p) => renderProfile(p, depth + 1))}
          </>
        )}
      </div>
    );
  };

  const rootProfiles = profilesByGroup.get("__root__") ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          프로필
        </span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full"
            onClick={() => onNewProfile(null)}
            title="새 프로필"
          >
            <FilePlus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full"
            onClick={() => onNewGroup(null)}
            title="새 폴더"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {rootGroups.map((g) => renderGroup(g, 0))}
          {rootProfiles.map((p) => renderProfile(p, 0))}
          {profiles.length === 0 && groups.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              프로필이 없습니다. 상단{" "}
              <FilePlus className="inline h-3 w-3 align-text-top" /> 버튼으로
              추가하세요.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
