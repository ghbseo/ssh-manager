import { useEffect, useState } from "react";
import { Plug, Save, FolderOpen, KeyRound, Trash2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "@/store/useStore";
import { api } from "@/lib/tauri";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { AuthType, Profile } from "@/lib/types";

type Props = {
  profile: Profile;
  onSaved: (id: string) => void;
  onConnect?: (id: string) => void;
};

export function ProfileForm({ profile, onSaved, onConnect }: Props) {
  const upsertProfile = useStore((s) => s.upsertProfile);
  const groups = useStore((s) => s.groups);

  const [form, setForm] = useState<Profile>(profile);
  const [secret, setSecret] = useState("");
  const [hasSecret, setHasSecret] = useState(false);

  useEffect(() => {
    setForm(profile);
    setSecret("");
    void refreshSecretState(profile.id, profile.authType);
  }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshSecretState = async (id: string, authType: AuthType) => {
    try {
      const kind = authType === "password" ? "password" : "passphrase";
      const has = await api.hasProfileSecret(id, kind);
      setHasSecret(has);
    } catch {
      setHasSecret(false);
    }
  };

  const patch = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const pickKey = async () => {
    const picked = await open({
      multiple: false,
      directory: false,
      title: "개인키 파일 선택",
    });
    if (typeof picked === "string") patch("keyPath", picked);
  };

  const save = async () => {
    await upsertProfile(form);
    onSaved(form.id);
  };

  const saveSecret = async () => {
    if (!secret) return;
    const kind = form.authType === "password" ? "password" : "passphrase";
    await api.setProfileSecret(form.id, kind, secret);
    setSecret("");
    setHasSecret(true);
    await upsertProfile({ ...form, hasSecret: true });
  };

  const clearSecret = async () => {
    const kind = form.authType === "password" ? "password" : "passphrase";
    await api.deleteProfileSecret(form.id, kind);
    setHasSecret(false);
    await upsertProfile({ ...form, hasSecret: false });
  };

  const connect = async () => {
    await save();
    onConnect?.(form.id);
  };

  const showKeyField = form.authType === "key";
  const showSecretField =
    form.authType === "password" || form.authType === "key";
  const secretLabel = form.authType === "password" ? "비밀번호" : "키 암호";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            프로필
          </div>
          <div className="text-[22px] font-semibold tracking-tight truncate">
            {form.name || "제목 없음"}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={save} className="rounded-full">
            <Save className="h-4 w-4" /> 저장
          </Button>
          <Button onClick={connect} className="rounded-full">
            <Plug className="h-4 w-4" /> 연결
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="예: prod-api-1"
              autoFocus
            />
          </div>
          <div className="col-span-2 grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="host">호스트</Label>
              <Input
                id="host"
                value={form.host}
                onChange={(e) => patch("host", e.target.value)}
                placeholder="example.com 또는 10.0.0.1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">포트</Label>
              <Input
                id="port"
                type="number"
                inputMode="numeric"
                min={1}
                max={65535}
                value={form.port === 0 ? "" : form.port}
                onChange={(e) => {
                  const v = e.target.value;
                  patch("port", v === "" ? 0 : Number(v));
                }}
                onBlur={() => {
                  if (!form.port) patch("port", 22);
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user">사용자</Label>
            <Input
              id="user"
              value={form.user}
              onChange={(e) => patch("user", e.target.value)}
              placeholder="root"
            />
          </div>
          <div className="space-y-1.5">
            <Label>폴더</Label>
            <Select
              value={form.groupId ?? "__root__"}
              onValueChange={(v) =>
                patch("groupId", v === "__root__" ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">(최상위)</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="space-y-3">
          <Label>인증 방식</Label>
          <Select
            value={form.authType}
            onValueChange={(v) => patch("authType", v as AuthType)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="key">개인키</SelectItem>
              <SelectItem value="password">비밀번호</SelectItem>
              <SelectItem value="agent">SSH 에이전트</SelectItem>
            </SelectContent>
          </Select>

          {showKeyField && (
            <div className="space-y-1.5">
              <Label htmlFor="keyPath">개인키 경로</Label>
              <div className="flex gap-2">
                <Input
                  id="keyPath"
                  value={form.keyPath ?? ""}
                  onChange={(e) => patch("keyPath", e.target.value)}
                  placeholder="C:\Users\me\.ssh\id_ed25519"
                />
                <Button variant="outline" onClick={pickKey} type="button">
                  <FolderOpen className="h-4 w-4" /> 찾아보기
                </Button>
              </div>
            </div>
          )}

          {showSecretField && (
            <div className="space-y-2">
              <Label>
                {secretLabel}
                {hasSecret && (
                  <span className="ml-2 text-xs text-primary">
                    <KeyRound className="inline h-3 w-3" /> 자격증명 관리자에
                    저장됨
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={
                    hasSecret
                      ? "•••••• (비워두면 유지)"
                      : "비밀값 입력"
                  }
                  autoComplete="new-password"
                />
                <Button
                  variant="outline"
                  onClick={saveSecret}
                  disabled={!secret}
                  type="button"
                >
                  저장
                </Button>
                {hasSecret && (
                  <Button
                    variant="ghost"
                    onClick={clearSecret}
                    type="button"
                    title="저장된 비밀값 제거"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                비밀값은 Windows 자격증명 관리자에 안전하게 보관되며, 연결 시
                SSH 프롬프트를 감지하면 자동으로 입력됩니다.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-1.5">
          <Label htmlFor="notes">메모</Label>
          <textarea
            id="notes"
            className="flex min-h-[96px] w-full rounded-[10px] border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={form.notes ?? ""}
            onChange={(e) => patch("notes", e.target.value)}
            placeholder="선택 메모…"
          />
        </section>
      </div>
    </div>
  );
}
