import { useMemo } from "react";
import { Star, Plug } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "./ui/button";

type Props = {
  onSelectProfile: (id: string) => void;
  onConnectProfile: (id: string) => void;
};

export function FavoritesBar({
  onSelectProfile,
  onConnectProfile,
}: Props) {
  const profiles = useStore((s) => s.profiles);
  const favorites = useMemo(
    () => profiles.filter((p) => p.favorite),
    [profiles],
  );

  if (favorites.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/40 overflow-x-auto">
      <Star className="h-4 w-4 text-yellow-400 shrink-0" />
      {favorites.map((p) => (
        <Button
          key={p.id}
          size="sm"
          variant="secondary"
          className="h-7 gap-1.5 shrink-0 rounded-full px-3"
          onClick={() => onSelectProfile(p.id)}
          onDoubleClick={() => onConnectProfile(p.id)}
          title={`${p.user}@${p.host}:${p.port} · 더블클릭으로 연결`}
        >
          <Plug className="h-3 w-3" />
          {p.name || "(이름 없음)"}
        </Button>
      ))}
    </div>
  );
}
