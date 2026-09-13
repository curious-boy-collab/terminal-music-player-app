const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Enable keypress events and raw mode so single keys like 'q' are detected without Enter
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdin.on("keypress", (str, key) => {
    // Instant quit on 'q' or Ctrl+C
    if (key && (key.name === "q" || str === "q" || str === "Q" || (key.ctrl && key.name === "c"))) {
        console.log("\nGoodbye! 👋");
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        process.exit(0);
    }

    // Play next song on Right Arrow (→)
    if (key && key.name === "right") {
        nextSong();
        showInterface();
        process.stdout.write("\nEnter your choice: ");
    }

    // Play previous song on Left Arrow (←)
    if (key && key.name === "left") {
        prevSong();
        showInterface();
        process.stdout.write("\nEnter your choice: ");
    }

    // Forward 10 seconds on 'd' or 'D'
    if (key && (key.name === "d" || str === "d" || str === "D")) {
        forward10();
    }

    // Backward 10 seconds on 'a' or 'A'
    if (key && (key.name === "a" || str === "a" || str === "A")) {
        backward10();
    }
});

rl.on("close", () => {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }
});

const songs = [
    "Blinding Lights",
    "Starboy",
    "Save Your Tears",
    "The Hills"
];

let currentSong = null;
let currentTime = 0; // playback position in seconds
const songDuration = 210; // default duration (3:30)

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function forward10() {
    if (!currentSong) {
        currentSong = songs[0];
    }
    currentTime = Math.min(currentTime + 10, songDuration);
    showInterface();
    if (rl) {
        rl.line = "";
        rl.cursor = 0;
    }
    process.stdout.write("\nEnter your choice: ");
}

function backward10() {
    if (!currentSong) {
        currentSong = songs[0];
    }
    currentTime = Math.max(currentTime - 10, 0);
    showInterface();
    if (rl) {
        rl.line = "";
        rl.cursor = 0;
    }
    process.stdout.write("\nEnter your choice: ");
}

function nextSong() {
    if (songs.length === 0) return;
    const currentIndex = songs.indexOf(currentSong);
    if (currentIndex === -1 || currentIndex >= songs.length - 1) {
        currentSong = songs[0];
    } else {
        currentSong = songs[currentIndex + 1];
    }
    currentTime = 0;
}

function prevSong() {
    if (songs.length === 0) return;
    const currentIndex = songs.indexOf(currentSong);
    if (currentIndex <= 0) {
        currentSong = songs[songs.length - 1];
    } else {
        currentSong = songs[currentIndex - 1];
    }
    currentTime = 0;
}

function showInterface() {
    console.clear();

    console.log("========================================");
    console.log("          🎵 MUSIC PLAYER");
    console.log("========================================");

    console.log();

    console.log(
        "Now Playing:",
        currentSong ? `${currentSong} (${formatTime(currentTime)} / ${formatTime(songDuration)})` : "Nothing"
    );

    console.log();

    console.log("Playlist:");

    songs.forEach((song, index) => {
        if (song === currentSong) {
            console.log(`> ${index + 1}. ${song}`);
        } else {
            console.log(`  ${index + 1}. ${song}`);
        }
    });

    console.log();

    console.log("----------------------------------------");
    console.log("Commands:");
    console.log("1 → Play");
    console.log("2 → Pause");
    console.log("3 → Next (or → key)");
    console.log("4 → Previous (or ← key)");
    console.log("d → Forward 10s (or 'd' key)");
    console.log("a → Backward 10s (or 'a' key)");
    console.log("5 → Show Playlist");
    console.log("6 → Exit (or press 'q')");
    console.log("----------------------------------------");
}

function askCommand() {
    showInterface();

    rl.question("\nEnter your choice: ", (choice) => {

        if (choice === "1") {
            playSong();
        }

        else if (choice === "2") {
            console.log("\n⏸ Music paused.");
            askAgain();
        }

        else if (choice === "3") {
            nextSong();
            console.log(`\n⏭ Next song: ${currentSong}`);
            askAgain();
        }

        else if (choice === "4") {
            prevSong();
            console.log(`\n⏮ Previous song: ${currentSong}`);
            askAgain();
        }

        else if (choice.trim().toLowerCase() === "d") {
            forward10();
        }

        else if (choice.trim().toLowerCase() === "a") {
            backward10();
        }

        else if (choice === "5") {
            showPlaylist();
        }

        else if (choice === "6" || choice.trim().toLowerCase() === "q") {
            console.log("\nGoodbye! 👋");
            rl.close();
        }

        else {
            console.log("\n❌ Invalid choice.");
            askAgain();
        }
    });
}

function playSong() {

    console.log("\nSelect a song:");

    songs.forEach((song, index) => {
        console.log(`${index + 1}. ${song}`);
    });

    rl.question("\nEnter song number: ", (number) => {

        const index = Number(number) - 1;

        if (index >= 0 && index < songs.length) {

            currentSong = songs[index];
            currentTime = 0;

            console.log(`\n▶ Now Playing: ${currentSong}`);

            askAgain();

        } else {

            console.log("\n❌ Invalid song number.");

            askAgain();
        }
    });
}

function showPlaylist() {

    console.log("\n🎵 PLAYLIST");

    songs.forEach((song, index) => {
        console.log(`${index + 1}. ${song}`);
    });

    askAgain();
}

function askAgain() {

    rl.question("\nPress Enter to continue (or 'q' to quit)... ", (input) => {
        if (input.trim().toLowerCase() === "q") {
            console.log("\nGoodbye! 👋");
            rl.close();
            return;
        }
        askCommand();
    });
}

askCommand();