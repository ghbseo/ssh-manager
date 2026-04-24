import { useEffect, useState } from "react";
import { Plug, Star, Pencil } from "lucide-react";
import { useStore } from "@/store/useStore";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectProfile: (id: string) => void;
  onConnectProfile: (id: string) => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  onSelectProfile,
  onConnectProfile,
}: Props) {
  const profiles = useStore((s) => s.profiles);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const favorites = profiles.filter((p) => p.favorite);
  const others = profiles.filter((p) => !p.favorite);

  const connect = (id: string) => {
    onOpenChange(false);
    onConnectProfile(id);
  };

  const edit = (id: string) => {
    onOpenChange(false);
    onSelectProfile(id);
  };

  const renderItem = (
    p: (typeof profiles)[number],
    icon: React.ReactNode,
  ) => (
    <CommandItem
      key={p.id}
      value={`${p.name} ${p.host} ${p.user}`}
      onSelect={() => connect(p.id)}
      className="group"
    >
      {icon}
      <span className="flex-1 truncate">{p.name || "(이름 없음)"}</span>
      <span className="text-xs text-muted-foreground truncate">
        {p.user}@{p.host}:{p.port}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          edit(p.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="ml-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted"
        title="편집"
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </CommandItem>
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="이름, 호스트, 사용자로 검색…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>일치하는 항목이 없습니다.</CommandEmpty>
        {favorites.length > 0 && (
          <CommandGroup heading="즐겨찾기">
            {favorites.map((p) =>
              renderItem(
                p,
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />,
              ),
            )}
          </CommandGroup>
        )}
        {others.length > 0 && (
          <CommandGroup heading="전체 프로필">
            {others.map((p) =>
              renderItem(
                p,
                <Plug className="h-4 w-4 text-muted-foreground" />,
              ),
            )}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center justify-between gap-4 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">
              Enter
            </kbd>{" "}
            연결
          </span>
          <span>
            <Pencil className="inline h-3 w-3" /> 편집
          </span>
        </div>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Esc</kbd>{" "}
          닫기
        </span>
      </div>
    </CommandDialog>
  );
}
