# SSH 매니저

Termius 스타일의 Windows 데스크톱 SSH 프로필 관리자. Tauri 2 + React + TypeScript로 작성했고, 경량 UI 위에 xterm.js 내장 터미널을 제공합니다.

![version](https://img.shields.io/badge/version-0.1.1-blue) ![platform](https://img.shields.io/badge/platform-Windows-lightgrey)

## 주요 기능

- 프로필 CRUD, 중첩 폴더, 즐겨찾기, Cmd-K 빠른 검색
- **앱 내장 터미널** — xterm.js + portable-pty (ConPTY)로 ssh 세션을 앱 안에서 실행
- **다중 탭** — 여러 세션을 동시에 열고 탭으로 전환, 탭별 세션 유지
- **자동 로그인** — Windows 자격 증명 관리자에 저장된 비밀번호/키 암호를 SSH 프롬프트 감지 시 자동 주입
- **시스템/어둡게/밝게 테마** — 상단바 및 설정에서 전환 가능
- **한국어 UI + 설치 마법사 한국어화**
- 외부 터미널(wt/pwsh/cmd/WSL bash) 연동도 옵션으로 지원

## 기술 스택

| 레이어 | 선택 |
|---|---|
| 쉘·네이티브 | Tauri 2 |
| 프론트엔드 | React 18 + Vite 6 + TypeScript |
| 스타일 | Tailwind CSS 3 + shadcn/ui |
| 상태관리 | Zustand |
| 검색 | cmdk |
| 터미널 | xterm.js + @xterm/addon-fit |
| PTY / SSH | portable-pty (ConPTY) + OpenSSH `ssh.exe` |
| 비밀 저장 | keyring (Windows Credential Manager) |
| 데이터 저장 | JSON (`%APPDATA%\com.hbseo.sshmanager\profiles.json`) |

## 요구 환경

- **런타임**: Windows 10 1903+ (ConPTY), Microsoft Edge WebView2 Runtime (Win10/11 기본 포함)
- **빌드**: Node 20+, Rust stable (x86_64-pc-windows-msvc), Visual Studio Build Tools (C++ 워크로드)

## 시작하기

### 개발 모드
```powershell
npm install
npm run tauri:dev
```

`tauri:dev`는 포트 5173이 사용 중이면 자동으로 다음 빈 포트로 올라갑니다.

### 배포 빌드
```powershell
npm run tauri build
```

산출물:
- `src-tauri\target\release\bundle\nsis\SSH Manager_<ver>_x64-setup.exe`
- `src-tauri\target\release\bundle\msi\SSH Manager_<ver>_x64_ko-KR.msi`
- `src-tauri\target\release\bundle\msi\SSH Manager_<ver>_x64_en-US.msi`

설치 마법사는 한국어/영어 선택 가능, 커스텀 `>_` 배너 반영.

## 디렉토리 구조

```
ssh-manager/
├─ src/                           # React 프론트엔드
│  ├─ App.tsx                     # 상단바, 탭, 사이드바, 라우팅
│  ├─ components/
│  │  ├─ ui/                      # shadcn Button/Input/Dialog/Command/...
│  │  ├─ ProfileTree.tsx          # 중첩 폴더 트리
│  │  ├─ ProfileForm.tsx          # 프로필 편집 + 비밀값 저장
│  │  ├─ TerminalView.tsx         # xterm.js 세션 뷰
│  │  ├─ CommandPalette.tsx       # Cmd-K 검색
│  │  ├─ FavoritesBar.tsx
│  │  └─ SettingsDialog.tsx
│  ├─ store/useStore.ts           # Zustand + Tauri persist
│  ├─ lib/
│  │  ├─ tauri.ts                 # invoke 래퍼
│  │  ├─ theme.ts                 # 시스템 테마 리스너
│  │  └─ disableDevtools.ts       # DevTools 차단 가드
│  └─ styles/globals.css          # Tailwind 테마 토큰
└─ src-tauri/
   ├─ src/
   │  ├─ lib.rs                   # Tauri 엔트리, 상태 등록, DevTools 방어
   │  ├─ commands.rs              # 9종 invoke 커맨드
   │  ├─ store.rs                 # profiles.json load/save (atomic)
   │  ├─ secrets.rs               # keyring (Credential Manager)
   │  ├─ terminal.rs              # 외부 터미널 spawn + 템플릿 치환
   │  └─ pty.rs                   # ConPTY 세션 + 비밀값 자동 주입
   ├─ installer/                  # NSIS 배너 이미지 (header/sidebar bmp)
   ├─ icons/                      # 아이콘 세트 (tauri icon 생성)
   └─ tauri.conf.json             # 번들/윈도우/퍼미션 설정
```

## 데이터 모델

```ts
type Profile = {
  id: string; name: string; host: string; port: number; user: string;
  authType: 'password' | 'key' | 'agent';
  keyPath?: string;                   // authType === 'key'
  hasSecret: boolean;                  // Credential Manager 보유 여부 플래그
  groupId: string | null; favorite: boolean;
  color?: string; notes?: string;
  createdAt: string; updatedAt: string;
};
```

비밀번호/키 암호는 JSON에 저장되지 않고 Windows 자격 증명 관리자에
`service=ssh-manager, account=profile:{id}:{password|passphrase}` 규약으로만 저장됩니다.

## 단축키

| 키 | 동작 |
|---|---|
| `Ctrl + K` | 빠른 검색 팔레트 |
| `Ctrl + W` | 현재 터미널 탭 닫기 |
| `Enter` (팔레트) | 프로필 연결 |
| `Esc` (팔레트/다이얼로그) | 닫기 |

## 로드맵 (후보)

- 포트 포워딩 UI
- SSH 키 생성/가져오기
- 프로필 import/export
- 자동 업데이트 (tauri-plugin-updater)
- macOS/Linux 빌드

## 라이선스

[MIT](./LICENSE) © 2026 hbseo
