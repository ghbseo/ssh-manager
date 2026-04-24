import { useEffect, useState } from "react";
import { FolderOpen, RefreshCcw } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "@/store/useStore";
import { api } from "@/lib/tauri";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { Settings, TerminalCandidate } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function SettingsDialog({ open: isOpen, onOpenChange }: Props) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [terminalPath, setTerminalPath] = useState(settings.terminalPath);
  const [argsTemplate, setArgsTemplate] = useState(
    settings.terminalArgsTemplate,
  );
  const [sshArgs, setSshArgs] = useState(settings.defaultSshArgs);
  const [theme, setTheme] = useState<Settings["theme"]>(settings.theme);
  const [candidates, setCandidates] = useState<TerminalCandidate[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTerminalPath(settings.terminalPath);
      setArgsTemplate(settings.terminalArgsTemplate);
      setSshArgs(settings.defaultSshArgs);
      setTheme(settings.theme);
      void refreshCandidates();
    }
  }, [isOpen, settings]);

  const refreshCandidates = async () => {
    try {
      const list = await api.detectTerminals();
      setCandidates(list);
    } catch (err) {
      console.error(err);
    }
  };

  const pickExe = async () => {
    const picked = await open({
      multiple: false,
      directory: false,
      title: "터미널 실행파일 선택",
      filters: [{ name: "실행파일", extensions: ["exe"] }],
    });
    if (typeof picked === "string") setTerminalPath(picked);
  };

  const apply = async (c: TerminalCandidate) => {
    setTerminalPath(c.path);
    setArgsTemplate(c.argsTemplate);
  };

  const save = async () => {
    await updateSettings({
      terminalPath,
      terminalArgsTemplate: argsTemplate,
      defaultSshArgs: sshArgs,
      theme,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-[20px] tracking-tight">
              설정
            </DialogTitle>
            <DialogDescription>
              SSH 기본 옵션과 테마를 설정합니다. 외부 터미널은 선택 사항이며,
              설정하지 않으면 앱 내장 터미널에서 연결됩니다.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>감지된 터미널</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshCandidates}
                className="h-7 rounded-full"
              >
                <RefreshCcw className="h-3 w-3" /> 새로고침
              </Button>
            </div>
            <div className="grid gap-2">
              {candidates.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  PATH에서 터미널을 찾지 못했습니다.
                </div>
              )}
              {candidates.map((c) => (
                <button
                  key={c.path}
                  onClick={() => apply(c)}
                  className="text-left rounded-xl border p-3 transition-colors hover:bg-accent"
                >
                  <div className="text-sm font-semibold tracking-tight">
                    {c.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.path}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="terminalPath">터미널 실행파일</Label>
            <div className="flex gap-2">
              <Input
                id="terminalPath"
                value={terminalPath}
                onChange={(e) => setTerminalPath(e.target.value)}
                placeholder="C:\\경로\\터미널.exe"
              />
              <Button variant="outline" onClick={pickExe} type="button">
                <FolderOpen className="h-4 w-4" /> 찾아보기
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="argsTemplate">인자 템플릿</Label>
            <Input
              id="argsTemplate"
              value={argsTemplate}
              onChange={(e) => setArgsTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              플레이스홀더:{" "}
              <code>{"{name}"}</code> <code>{"{host}"}</code>{" "}
              <code>{"{port}"}</code> <code>{"{user}"}</code>{" "}
              <code>{"{keyPath}"}</code> <code>{"{keyArg}"}</code>{" "}
              <code>{"{sshArgs}"}</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sshArgs">기본 SSH 인자</Label>
            <Input
              id="sshArgs"
              value={sshArgs}
              onChange={(e) => setSshArgs(e.target.value)}
              placeholder="-o ServerAliveInterval=30"
            />
          </div>

          <div className="space-y-1.5">
            <Label>테마</Label>
            <Select
              value={theme}
              onValueChange={(v) => setTheme(v as Settings["theme"])}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">시스템 설정 사용</SelectItem>
                <SelectItem value="dark">어둡게</SelectItem>
                <SelectItem value="light">밝게</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-6 py-4 border-t">
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              취소
            </Button>
            <Button onClick={save} className="rounded-full">
              저장
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
