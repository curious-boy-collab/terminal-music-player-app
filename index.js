const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

// ANSI color palette for sleek terminal styling
const c = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m",
    gray: "\x1b[90m",
    white: "\x1b[97m",
    red: "\x1b[31m"
};

const AUDIO_EXTS = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".aiff", ".aif"]);

// Get audio duration in seconds using afinfo (macOS) with fallback
function getAudioDuration(filePath) {
    try {
        if (process.platform === "darwin") {
            const out = execSync(`afinfo "${filePath}"`, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
            const match = out.match(/estimated duration:\s*([\d.]+)\s*sec/);
            if (match) return Math.max(1, Math.round(parseFloat(match[1])));
        }
    } catch (e) {}
    return 210; // default 3:30 fallback
}

// Truncate long strings cleanly
function truncate(str, maxLen = 45) {
    if (!str) return "";
    return str.length > maxLen ? str.slice(0, maxLen - 3) + "..." : str;
}

// Format seconds into MM:SS
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Generate visual progress bar with slider thumb and percentage
function getProgressBar(current, total, width = 22) {
    if (!total || total <= 0) total = 1;
    const ratio = Math.min(Math.max(current / total, 0), 1);
    const percent = Math.round(ratio * 100);

    const thumbPos = Math.min(Math.round(ratio * (width - 1)), width - 1);
    const filled = "━".repeat(thumbPos);
    const thumb = "🔘";
    const empty = "─".repeat(width - 1 - thumbPos);

    return `${c.cyan}${filled}${thumb}${c.gray}${empty}${c.reset} ${c.white}${c.bold}${formatTime(current)}${c.reset} ${c.gray}/${c.reset} ${c.dim}${formatTime(total)}${c.reset} ${c.yellow}(${percent}%)${c.reset}`;
}

// Load songs from current directory, a folder path, or a specific file
function loadSongsFromTarget(targetArg) {
    let searchDir = process.cwd();
    let specificFile = null;

    if (targetArg) {
        const resolved = path.resolve(targetArg);
        if (fs.existsSync(resolved)) {
            const stat = fs.statSync(resolved);
            if (stat.isDirectory()) {
                searchDir = resolved;
            } else if (stat.isFile()) {
                specificFile = resolved;
                searchDir = path.dirname(resolved);
            }
        } else {
            return {
                error: `Provided path does not exist: "${targetArg}"`,
                searchDir: process.cwd(),
                songs: [],
                initialIndex: 0
            };
        }
    }

    let files = [];
    try {
        files = fs.readdirSync(searchDir);
    } catch (e) {
        files = [];
    }

    const songs = [];
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (AUDIO_EXTS.has(ext)) {
            const fullPath = path.join(searchDir, file);
            try {
                if (fs.statSync(fullPath).isFile()) {
                    songs.push({
                        title: path.basename(file, ext),
                        filename: file,
                        fullPath: fullPath,
                        duration: getAudioDuration(fullPath)
                    });
                }
            } catch (e) {}
        }
    }

    let initialIndex = 0;
    if (specificFile) {
        const found = songs.findIndex(s => s.fullPath === specificFile);
        if (found !== -1) {
            initialIndex = found;
        } else {
            const ext = path.extname(specificFile);
            songs.unshift({
                title: path.basename(specificFile, ext),
                filename: path.basename(specificFile),
                fullPath: specificFile,
                duration: getAudioDuration(specificFile)
            });
            initialIndex = 0;
        }
    }

    return { error: null, searchDir, songs, initialIndex };
}

// Resolve song source from CLI argument
const cliArg = process.argv[2];
const { error: loadError, searchDir, songs, initialIndex } = loadSongsFromTarget(cliArg);

let currentSongIndex = initialIndex;
let isPlaying = songs.length > 0;
let currentTime = 0;
let audioProcess = null;

// Audio process controls (spawns afplay on macOS)
function startAudio() {
    stopAudio();
    if (songs.length === 0) return;

    const currentSong = songs[currentSongIndex];
    if (!currentSong || !currentSong.fullPath) return;

    try {
        if (process.platform === "darwin") {
            audioProcess = spawn("afplay", [currentSong.fullPath], { stdio: "ignore" });
        } else if (process.platform === "win32") {
            audioProcess = spawn("powershell", ["-c", `(New-Object Media.SoundPlayer '${currentSong.fullPath}').PlaySync()`]);
        } else {
            audioProcess = spawn("aplay", [currentSong.fullPath], { stdio: "ignore" });
        }

        audioProcess.on("exit", (code) => {
            // When audio finishes naturally and still in playing state, advance to next track
            if (code === 0 && isPlaying) {
                nextSong();
            }
        });
    } catch (e) {
        audioProcess = null;
    }
}

function stopAudio() {
    if (audioProcess) {
        try {
            audioProcess.kill("SIGKILL");
        } catch (e) {}
        audioProcess = null;
    }
}

function pauseAudio() {
    if (audioProcess) {
        try {
            audioProcess.kill("SIGSTOP");
        } catch (e) {}
    }
}

function resumeAudio() {
    if (audioProcess) {
        try {
            audioProcess.kill("SIGCONT");
        } catch (e) {}
    } else {
        startAudio();
    }
}

function showInterface() {
    console.clear();

    const currentSong = songs[currentSongIndex];
    const statusBadge = songs.length === 0
        ? `${c.gray}⏹ NO TRACKS${c.reset}`
        : (isPlaying ? `${c.green}${c.bold}▶ PLAYING${c.reset}` : `${c.yellow}${c.bold}⏸ PAUSED${c.reset}`);

    console.log(`${c.cyan}============================================================${c.reset}`);
    console.log(`${c.bold}${c.cyan}                  🎵 TERMINAL MUSIC PLAYER${c.reset}`);
    console.log(`${c.cyan}============================================================${c.reset}`);
    console.log(`${c.gray}Folder:   ${c.reset}${c.dim}${truncate(searchDir, 50)}${c.reset}`);
    console.log(`${c.gray}Status:   ${c.reset}${statusBadge}`);

    if (loadError) {
        console.log(`${c.red}Notice:   ${loadError}${c.reset}`);
    }

    if (currentSong) {
        console.log(`${c.gray}Track:    ${c.reset}${c.bold}${c.white}${truncate(currentSong.title, 50)}${c.reset}`);
        console.log(`${c.gray}Progress: ${c.reset}${getProgressBar(currentTime, currentSong.duration, 22)}`);
    } else {
        console.log(`${c.gray}Track:    ${c.reset}${c.dim}No audio files found (.mp3, .wav, .m4a, .flac)${c.reset}`);
    }

    console.log(`${c.cyan}------------------------------------------------------------${c.reset}`);
    console.log(`${c.bold}Available Songs in Folder (${songs.length}):${c.reset}`);

    if (songs.length === 0) {
        console.log(`  ${c.yellow}⚠️  No audio files found in: ${truncate(searchDir, 40)}${c.reset}`);
        console.log(`  ${c.dim}💡 Tip: Put .mp3 files here, or run:${c.reset}`);
        console.log(`     ${c.cyan}node index.js /path/to/music-folder/${c.reset}`);
        console.log(`     ${c.cyan}node index.js song-name.mp3${c.reset}`);
    } else {
        songs.forEach((song, index) => {
            const num = index + 1;
            const displayTitle = truncate(song.title, 42);
            if (index === currentSongIndex) {
                console.log(`  ${c.green}${c.bold}▶ [${num}] ${displayTitle} 🎵 (Playing)${c.reset}`);
            } else {
                console.log(`  ${c.dim}  [${num}] ${displayTitle}${c.reset}`);
            }
        });
    }

    console.log(`${c.cyan}------------------------------------------------------------${c.reset}`);
    console.log(`${c.bold}Live Controls (No Enter Needed):${c.reset}`);
    console.log(`  ${c.yellow}[Space / p]${c.reset} Pause / Play      ${c.yellow}[1-${Math.min(9, songs.length || 1)}]${c.reset} Jump to Track`);
    console.log(`  ${c.yellow}[→]${c.reset}         Next Track        ${c.yellow}[d]${c.reset}   Forward +10s`);
    console.log(`  ${c.yellow}[←]${c.reset}         Previous Track    ${c.yellow}[a]${c.reset}   Rewind -10s`);
    console.log(`  ${c.yellow}[q]${c.reset}         Quit Player`);
    console.log(`${c.cyan}============================================================${c.reset}`);
}

function nextSong() {
    if (songs.length === 0) return;
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    currentTime = 0;
    isPlaying = true;
    startAudio();
    showInterface();
}

function prevSong() {
    if (songs.length === 0) return;
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    currentTime = 0;
    isPlaying = true;
    startAudio();
    showInterface();
}

function forward10() {
    if (songs.length === 0) return;
    const currentSong = songs[currentSongIndex];
    currentTime = Math.min(currentTime + 10, currentSong.duration);
    showInterface();
}

function backward10() {
    if (songs.length === 0) return;
    currentTime = Math.max(currentTime - 10, 0);
    showInterface();
}

function togglePlayPause() {
    if (songs.length === 0) return;
    isPlaying = !isPlaying;
    if (isPlaying) {
        resumeAudio();
    } else {
        pauseAudio();
    }
    showInterface();
}

function selectSong(index) {
    if (index >= 0 && index < songs.length) {
        currentSongIndex = index;
        currentTime = 0;
        isPlaying = true;
        startAudio();
        showInterface();
    }
}

function exitApp() {
    stopAudio();
    clearInterval(playbackTimer);
    process.stdout.write("\x1b[?25h"); // Restore terminal cursor
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }
    console.clear();
    console.log(`\n${c.green}${c.bold}🎵 Thanks for using Terminal Music Player. Goodbye! 👋${c.reset}\n`);
    process.exit(0);
}

// Global cleanup handlers to stop audio on unexpected exit
process.on("exit", stopAudio);
process.on("SIGINT", exitApp);
process.on("SIGTERM", exitApp);

// Setup raw mode for instant single keypress controls
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

// Hide terminal cursor for clean aesthetics
process.stdout.write("\x1b[?25l");

// Live playback loop - ticks every 1 second
const playbackTimer = setInterval(() => {
    if (isPlaying && songs.length > 0) {
        const currentSong = songs[currentSongIndex];
        currentTime++;
        if (currentTime >= currentSong.duration) {
            nextSong();
        } else {
            showInterface();
        }
    }
}, 1000);

// Keypress listener for instant controls
process.stdin.on("keypress", (str, key) => {
    // Quit on 'q' or Ctrl+C
    if (key && (key.name === "q" || str === "q" || str === "Q" || (key.ctrl && key.name === "c"))) {
        exitApp();
    }

    // Toggle Pause / Play with Space or 'p'
    if (key && (key.name === "space" || str === "p" || str === "P")) {
        togglePlayPause();
    }

    // Next Track (Right Arrow)
    if (key && key.name === "right") {
        nextSong();
    }

    // Previous Track (Left Arrow)
    if (key && key.name === "left") {
        prevSong();
    }

    // Forward +10s ('d')
    if (key && (key.name === "d" || str === "d" || str === "D")) {
        forward10();
    }

    // Rewind -10s ('a')
    if (key && (key.name === "a" || str === "a" || str === "A")) {
        backward10();
    }

    // Jump directly to track using number keys 1 to 9
    if (str && str >= "1" && str <= "9") {
        selectSong(Number(str) - 1);
    }
});

// Start playback and render UI
if (songs.length > 0) {
    startAudio();
}
showInterface();