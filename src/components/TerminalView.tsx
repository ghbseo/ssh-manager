import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { v4 as uuid } from "uuid";
import "@xterm/xterm/css/xterm.css";
import { api } from "@/lib/tauri";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Profile;
  onExit?: () => void;
};

// base64 <-> bytes (UTF-8)
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function TerminalView({ profile, onExit }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const sessionId = uuid();
    const term = new Terminal({
      cursorBlink: true,
      fontFamily:
        '"SFMono-Regular", "Menlo", "Cascadia Mono", "Consolas", "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: {
        background: "#0b0b0d",
        foreground: "#f5f5f7",
        cursor: "#2997ff",
        cursorAccent: "#0b0b0d",
        selectionBackground: "#2997ff40",
        black: "#1d1d1f",
        red: "#ff453a",
        green: "#30d158",
        yellow: "#ffd60a",
        blue: "#0a84ff",
        magenta: "#bf5af2",
        cyan: "#64d2ff",
        white: "#f5f5f7",
        brightBlack: "#6e6e73",
        brightRed: "#ff6961",
        brightGreen: "#63e6be",
        brightYellow: "#ffe066",
        brightBlue: "#4eb0ff",
        brightMagenta: "#d5a3ff",
        brightCyan: "#9ae6f2",
        brightWhite: "#ffffff",
      },
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    // Give layout a tick before measuring.
    requestAnimationFrame(() => fit.fit());

    let unlistenData: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;
    let closed = false;

    const start = async () => {
      term.writeln(
        `\x1b[2m연결 중: ${profile.user}@${profile.host}:${profile.port}\x1b[0m`,
      );
      try {
        unlistenData = await listen<string>(
          `pty:data:${sessionId}`,
          (e) => term.write(b64ToBytes(e.payload)),
        );
        unlistenExit = await listen(
          `pty:exit:${sessionId}`,
          () => {
            if (closed) return;
            closed = true;
            term.writeln("\r\n\x1b[2m[세션 종료]\x1b[0m");
            onExit?.();
          },
        );
        await api.ptyOpen(sessionId, profile.id, term.cols, term.rows);
      } catch (err) {
        term.writeln(`\r\n\x1b[31m연결 실패: ${err}\x1b[0m`);
      }
    };
    void start();

    const disposeData = term.onData((data) => {
      const bytes = new TextEncoder().encode(data);
      void api.ptyWrite(sessionId, bytesToB64(bytes));
    });

    const onResize = () => {
      try {
        fit.fit();
        void api.ptyResize(sessionId, term.cols, term.rows);
      } catch {}
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(hostRef.current);

    return () => {
      closed = true;
      disposeData.dispose();
      ro.disconnect();
      unlistenData?.();
      unlistenExit?.();
      void api.ptyClose(sessionId);
      term.dispose();
    };
  }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full w-full bg-[#0b0b0d] p-2">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
