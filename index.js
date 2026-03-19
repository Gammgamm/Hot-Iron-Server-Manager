const { spawn } = require('child_process');
const path = require('path');

// Gamma - Ray, HIE
// ---------------------------------------
// 1. GUI PLACEHOLDER VARIABLES
// ---------------------------------------
let maxRam = '2G'; 
let minRam = '2G';
let jarName = 'server.jar';
let restartIntervalHours = 12; // Set to 0 if the user chooses "Do not auto-restart"

// System variables to keep track of the server state
const serverDir = path.join(__dirname, 'servers/My_First_Automated_Server');
let serverProcess = null;
let isRestarting = false; 

// ---------------------------------------
// 2. THE MAIN SERVER FUNCTION
// ---------------------------------------
function startServer() {
    console.log(`\n[SYSTEM] Starting Minecraft Server with ${maxRam} RAM...`);
    isRestarting = false; // Reset the flag every time the server boots

    // Notice how we use `${maxRam}` to inject our variable into the Java command!
    serverProcess = spawn('java', [`-Xmx${maxRam}`, `-Xms${minRam}`, '-jar', jarName, 'nogui'], {
        cwd: serverDir,
        detached: false
    });

    // Capture standard output (Logs)
    serverProcess.stdout.on('data', (data) => {
        console.log(`[SERVER]: ${data.toString().trim()}`);
    });

    // Capture errors
    serverProcess.stderr.on('data', (data) => {
        console.error(`[ERROR]: ${data.toString().trim()}`);
    });

    // ---------------------------------------
    // 3. THE AUTO-RESTART TIMER
    // ---------------------------------------
    if (restartIntervalHours > 0) {
        // Convert hours to milliseconds (Hours * 60m * 60s * 1000ms)
        const restartTimeMs = restartIntervalHours * 60 * 60 * 1000;
        console.log(`[SYSTEM] Auto-restart scheduled in ${restartIntervalHours} hours.`);

        // setTimeout runs the code inside it ONCE after the specified time
        setTimeout(() => {
            console.log("\n[SYSTEM] Scheduled restart triggered. Saving and stopping server...");
            isRestarting = true; // Tell our app that THIS shutdown is on purpose
            
            // Send the stop command gracefully, just like a user typing it in the console
            serverProcess.stdin.write("stop\n"); 
        }, restartTimeMs);
    } else {
        console.log(`[SYSTEM] Auto-restart is DISABLED.`);
    }

    // ---------------------------------------
    // 4. THE RESTART TRIGGER
    // ---------------------------------------
    // This event fires the exact millisecond the Java process fully closes
    serverProcess.on('close', (code) => {
        console.log(`\n[SYSTEM] Server process exited (Code: ${code}).`);
        
        if (isRestarting) {
            console.log("[SYSTEM] Restarting server in 5 seconds to allow RAM to clear...");
            // Wait 5 seconds, then call this exact same function all over again!
            setTimeout(startServer, 5000); 
        } else {
            console.log("[SYSTEM] Server remains offline.");
        }
    });
}

// Start the server for the very first time when the app launches
startServer();
