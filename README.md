# 🎵 Terminal Music Player

A sleek, real-time, terminal-based audio player built with Node.js. It features automatic song discovery, live progress tracking, zero-prompt instant keyboard controls, and native audio playback with zero external npm dependencies.

```
============================================================
                  🎵 TERMINAL MUSIC PLAYER
============================================================
Folder:   /Users/nitinjaiswal/Desktop/BackendNode/terminal-music-player-app
Status:   ▶ PLAYING
Track:    song1
Progress: ━━━━━🔘────────────── 00:52 / 03:30 (25%)
------------------------------------------------------------
Available Songs in Folder (3):
  ▶ [1] song1 🎵 (Playing)
    [2] song2
    [3] song3
------------------------------------------------------------
Live Controls (No Enter Needed):
  [Space / p] Pause / Play      [1-3] Jump to Track
  [→]         Next Track        [d]   Forward +10s
  [←]         Previous Track    [a]   Rewind -10s
  [q]         Quit Player
============================================================
```

---

## ✨ Features

- 🎧 **Native Real Audio Output**: Plays real audio through your speakers using macOS's built-in CoreAudio engine (`afplay`).
- 📁 **Automatic Folder Scanning**: Scans your current directory or any target folder for audio files (`.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, `.aiff`).
- 🎯 **Flexible CLI Arguments**: Pass a specific audio file or a folder path directly from your terminal.
- ⚡ **Zero-Prompt Instant Controls**: No typing choices or pressing <kbd>Enter</kbd>. Every action triggers immediately upon tapping a single key.
- 📊 **Dynamic Visual Progress Bar**: Features a slider thumb (`🔘`), track progress (`━`/`─`), real-time elapsed counter, and percentage.
- ⏸ **Hardware-Level Pause & Resume**: Uses POSIX signals (`SIGSTOP` and `SIGCONT`) to freeze and resume audio without desync or re-buffering.
- 🎨 **Clean ANSI Terminal Interface**: Styled with modern colors, status badges, and hidden terminal cursor for a native application feel.

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** (v14 or higher recommended)
- **macOS** (uses native `afplay` & `afinfo` built into macOS) or Linux (`aplay`)

### 1. Clone the Repository

```bash
git clone https://github.com/curious-boy-collab/terminal-music-player-app.git
cd terminal-music-player-app
```

### 2. Run the Player

No `npm install` needed! The application uses standard Node.js built-ins (`fs`, `path`, `readline`, `child_process`).

```bash
node index.js
```

---

## 💡 How to Use

### 1. Play songs in the current directory
Simply run the command in any folder containing `.mp3` or `.wav` files:
```bash
node index.js
```

### 2. Play a specific audio file
Provide the file name or relative/absolute path:
```bash
node index.js song1.mp3
node index.js "~/Downloads/track.mp3"
```

### 3. Play all songs from any folder
Point the player to any directory on your system:
```bash
node index.js ~/Music
node index.js /System/Library/Sounds
```

### 4. (Optional) Run from anywhere via alias
Add an alias to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
alias tmusic="node /path/to/terminal-music-player-app/index.js"
```
Now you can type `tmusic` in any terminal window!

---

## 🎮 Keyboard Controls (Instant Keypresses)

No need to press <kbd>Enter</kbd>—tap the key directly:

| Key | Action | Description |
| :--- | :--- | :--- |
| <kbd>Space</kbd> or <kbd>p</kbd> | **Pause / Play** | Toggles playback; hardware-pauses the audio stream |
| <kbd>→</kbd> (Right Arrow) | **Next Track** | Immediately starts the next song in the playlist |
| <kbd>←</kbd> (Left Arrow) | **Previous Track** | Moves to the previous song (wraps to last) |
| <kbd>1</kbd> - <kbd>9</kbd> | **Direct Track Jump** | Jumps straight to song number 1 through 9 |
| <kbd>d</kbd> | **Fast-Forward +10s** | Advances playback position by 10 seconds |
| <kbd>a</kbd> | **Rewind -10s** | Rewinds playback position by 10 seconds |
| <kbd>q</kbd> or <kbd>Ctrl+C</kbd> | **Quit** | Stops audio cleanly, restores cursor, and exits |

---

## 🛠️ How It Works Under the Hood

### 1. Audio Discovery & Path Resolution
The app inspects command line arguments via `process.argv[2]`:
- If given a directory, it reads all files using `fs.readdirSync()` matching audio extensions (`.mp3`, `.wav`, `.m4a`, etc.).
- If given a specific file, it sets that song as index 0 and loads sibling tracks.
- If no argument is passed, it defaults to scanning `process.cwd()`.

### 2. True Audio Duration Querying
Instead of guessing track lengths, the app runs:
```bash
afinfo "<filepath>"
```
and parses the `estimated duration:` field in seconds, ensuring the progress bar and total time (`04:33`) match the actual file.

### 3. Native Audio Process Control (`child_process.spawn`)
Audio playback is delegated to macOS's native `afplay` process:
```javascript
audioProcess = spawn("afplay", [currentSong.fullPath], { stdio: "ignore" });
```
- **Pause**: `audioProcess.kill("SIGSTOP")` halts the process at the OS kernel level, freezing sound output.
- **Resume**: `audioProcess.kill("SIGCONT")` signals the process to continue audio streaming seamlessly.
- **Stop**: `audioProcess.kill("SIGKILL")` terminates playback before switching songs or on exit.

### 4. Non-Blocking Keypress Input (Raw Mode)
Standard Node CLI scripts wait for lines ending in `\n`. This player enables raw mode:
```javascript
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
```
Every keystroke emits a `"keypress"` event immediately, enabling instant responses to arrow keys, letters, and numbers without buffering.

### 5. Smooth Screen Rendering
- `\x1b[?25l` hides the blinking terminal cursor while playing.
- When quitting, `\x1b[?25h` and `process.stdin.setRawMode(false)` restore your terminal settings back to normal.
- A 1-second `setInterval` updates the slider thumb and timer smoothly while music is playing.

---

## 📄 Supported Audio Formats

- `.mp3` (MPEG Layer 3)
- `.wav` (Waveform Audio)
- `.m4a` / `.aac` (Advanced Audio Coding)
- `.flac` (Free Lossless Audio Codec)
- `.aiff` / `.aif` (Audio Interchange File Format)
- `.ogg` (Ogg Vorbis)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/curious-boy-collab/terminal-music-player-app/issues).

---

## 📝 License

This project is licensed under the MIT License.
