const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');


// Gamma - Ray, HIE
//-----------------------------------
// Fix for sudo-prompt on modern Node
//-----------------------------------
const util = require('util');

// Add isObject
if (!util.isObject) {
    util.isObject = function(val) {
        return val !== null && typeof val === 'object';
    };
}

// Add isFunction
if (!util.isFunction) {
    util.isFunction = function(val) {
        return typeof val === 'function';
    };
}

// Add isString
if (!util.isString) {
    util.isString = function(val) {
        return typeof val === 'string';
    };
}
//-----------------------------------

const sudo = require('sudo-prompt');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
}

// IPC: CREATE SERVER FOLDER AND METADATA
ipcMain.handle('server:create', async (event, data) => {
    try {
        const mainServersDir = path.join(app.getPath('userData'), 'servers');
        const targetServerDir = path.join(mainServersDir, data.name);

        if (!fs.existsSync(targetServerDir)) {
            fs.mkdirSync(targetServerDir, { recursive: true });
        } else {
            return { success: false, error: "A server with this name already exists!" };
        }

        fs.writeFileSync(path.join(targetServerDir, 'eula.txt'), 'eula=true\n');

        const serverConfig = {
            name: data.name,
            port: data.port,
            ram: data.ram,
            software: data.software,
            version: data.version,
            modsPath: data.customModsPath,
            status: "offline"
        };
        
        fs.writeFileSync(
            path.join(targetServerDir, 'HIE-Server-config.json'), 
            JSON.stringify(serverConfig, null, 4)
        );

        // --- NEW: THE DOWNLOAD LOGIC ---
        const jarPath = path.join(targetServerDir, 'server.jar');
        await resolveAndDownloadJar(data.software, data.version, data.downloadUrl, jarPath);
        console.log(`[SYSTEM] Successfully downloaded server.jar for ${data.name}!`);

        // --- NEW: COPY CUSTOM MODS ---
        if (data.customModsPath && fs.existsSync(data.customModsPath)) {
            console.log(`[SYSTEM] Copying custom mods/plugins from ${data.customModsPath}...`);
            // Determine if we should name the folder 'mods' (Fabric) or 'plugins' (Paper)
            const destFolderName = data.software === 'fabric' ? 'mods' : 'plugins';
            const destPath = path.join(targetServerDir, destFolderName);
            
            // fs.cpSync recursively copies everything inside the folder to the new destination
            fs.cpSync(data.customModsPath, destPath, { recursive: true });
            console.log("[SYSTEM] Mods copied successfully!");
        }

        return { success: true };

    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
});

// IPC: OPEN SERVER FOLDER
ipcMain.handle('server:openFolder', async (event, serverName) => {
    const serverDir = path.join(app.getPath('userData'), 'servers', serverName);
    
    if (fs.existsSync(serverDir)) {
        // Asks the OS to open this exact path in the native file explorer
        await shell.openPath(serverDir);
        return { success: true };
    } else {
        return { success: false, error: "Server folder does not exist!" };
    }
});

// IPC: STARTUP SCANNER
ipcMain.handle('server:scan', async () => {
    const mainServersDir = path.join(app.getPath('userData'), 'servers');
    const foundServers = [];

    // If the folder doesn't exist yet (e.g., first time opening the app), return empty
    if (!fs.existsSync(mainServersDir)) {
        return foundServers; 
    }

    try {
        // Read every folder inside the 'servers' directory
        const folders = fs.readdirSync(mainServersDir);

        for (const folder of folders) {
            const configPath = path.join(mainServersDir, folder, 'HIE-Server-config.json');
            
            // If the config file exists, this is a valid server! Read it.
            if (fs.existsSync(configPath)) {
                const rawData = fs.readFileSync(configPath, 'utf8');
                const config = JSON.parse(rawData);
                foundServers.push(config);
            }
        }

        return foundServers;

    } catch (err) {
        console.error("[ERROR] Failed to scan servers:", err);
        return []; // Return empty on error so the app doesn't crash
    }
});

// IPC: THE SECURE TELEPHONE LINE
// This listens for a specific message called 'dialog:openDirectory'
ipcMain.handle('dialog:openDirectory', async () => {
    // Open the OS native file picker
    const result = await dialog.showOpenDialog({
        title: 'Select Mods/Plugins Directory',
        properties: ['openDirectory'] // Restrict it to folders only, no files!
    });

    // If the user clicks "Cancel" or closes the window
    if (result.canceled) {
        return null;
    } else {
        // Return the first folder path they selected back to the frontend
        return result.filePaths[0]; 
    }
});

// DOWNLOAD HELPER LOGIC
async function resolveAndDownloadJar(software, version, metadataUrl, targetPath) {
    let directUrl = '';

    console.log(`[SYSTEM] Resolving download link for ${software} ${version}...`);

    if (software === 'vanilla') {
        // Vanilla gives us a metadata URL. We fetch it to find the actual server.jar link.
        const res = await fetch(metadataUrl);
        const data = await res.json();
        directUrl = data.downloads.server.url;
    } 
    else if (software === 'paper') {
        // Paper requires us to find the latest "build" number for this version
        const res = await fetch(`https://api.papermc.io/v2/projects/paper/versions/${version}`);
        const data = await res.json();
        const latestBuild = data.builds[data.builds.length - 1]; // Get the newest build
        directUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild}/downloads/paper-${version}-${latestBuild}.jar`;
    } 
    else if (software === 'fabric') {
        // Fabric is amazing. We ask their API for the newest loader and installer, then build the URL.
        const loaderRes = await fetch('https://meta.fabricmc.net/v2/versions/loader');
        const loaderData = await loaderRes.json();
        const loaderVersion = loaderData[0].version; // Newest loader
        
        const installerRes = await fetch('https://meta.fabricmc.net/v2/versions/installer');
        const installerData = await installerRes.json();
        const installerVersion = installerData[0].version; // Newest installer
        
        directUrl = `https://meta.fabricmc.net/v2/versions/loader/${version}/${loaderVersion}/${installerVersion}/server/jar`;
    }

    console.log(`[SYSTEM] Direct link found! Downloading from: ${directUrl}`);

    // Create a Promise to pause the app until the download is 100% finished
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(targetPath);
        
        https.get(directUrl, (response) => {
            response.pipe(fileStream);
            
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlinkSync(targetPath); // Delete the corrupted file if it fails
            reject(err);
        });
    });
}

// STATE MANAGER: Track running servers
// Looks like: { "My Server": <ProcessData>, "SMP": <ProcessData> }
const activeServers = {}; 

// --- START SERVER ---
ipcMain.handle('server:start', async (event, serverName) => {
    if (activeServers[serverName]) return { success: false, error: "Already running!" };

    try {
        const serverDir = path.join(app.getPath('userData'), 'servers', serverName);
        
        // In the final version, you'd read HIE-Server-config.json here to get the exact RAM
        const mcProcess = spawn('java', ['-Xmx2G', '-Xms2G', '-jar', 'server.jar', 'nogui'], {
            cwd: serverDir,
            detached: false
        });

        // Save it to our state manager
        activeServers[serverName] = mcProcess;

        // Route the live logs back to the frontend!
        mcProcess.stdout.on('data', (data) => {
            const text = data.toString().trim();
            // We use webContents.send to push data to the frontend unprompted
            event.sender.send('server:log', { name: serverName, log: text });
        });

        // When the server closes, remove it from the state manager
        mcProcess.on('close', () => {
            delete activeServers[serverName];
            event.sender.send('server:status', { name: serverName, status: 'offline' });
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// --- SEND COMMAND ---
ipcMain.handle('server:command', async (event, data) => {
    const { name, command } = data;
    const mcProcess = activeServers[name];

    if (mcProcess) {
        // Send the command directly into the running Java console
        mcProcess.stdin.write(command + '\n');
        return { success: true };
    }
    return { success: false, error: "Server is not running offline." };
});

// --- STOP SERVER ---
ipcMain.handle('server:stop', async (event, serverName) => {
    const mcProcess = activeServers[serverName];
    if (mcProcess) {
        mcProcess.stdin.write('stop\n'); // Safely save and close
        return { success: true };
    }
    return { success: false, error: "Server is not running." };
});

// IPC: ADMIN FIREWALL CONFIGURATION
ipcMain.handle('firewall:open', async (event, port) => {
    return new Promise((resolve) => {
        const options = { name: 'Hot Iron Server Manager' };
        let command = '';

        if (process.platform === 'win32') {
            // Windows: Inbound AND Outbound for both TCP and UDP
            command = `netsh advfirewall firewall add rule name="Minecraft Server (Port ${port}) In" dir=in action=allow protocol=TCP localport=${port} && ` +
                      `netsh advfirewall firewall add rule name="Minecraft Server (Port ${port}) In" dir=in action=allow protocol=UDP localport=${port} && ` +
                      `netsh advfirewall firewall add rule name="Minecraft Server (Port ${port}) Out" dir=out action=allow protocol=TCP localport=${port} && ` +
                      `netsh advfirewall firewall add rule name="Minecraft Server (Port ${port}) Out" dir=out action=allow protocol=UDP localport=${port}`;
        } else if (process.platform === 'linux') {
            // Linux: ufw allow handles inbound by default, 'allow out' handles outbound
            command = `ufw allow ${port}/tcp && ufw allow ${port}/udp && ufw allow out ${port}/tcp && ufw allow out ${port}/udp`;
        } else {
            return resolve({ success: false, error: "Auto-firewall is only supported on Windows and Linux." });
        }

        console.log(`[SYSTEM] Requesting elevated permissions to run firewall commands...`);

        sudo.exec(command, options, (error, stdout, stderr) => {
            if (error) {
                console.error("[ERROR] Firewall config failed:", error);
                resolve({ success: false, error: error.message });
            } else {
                console.log(`[SYSTEM] Firewall Inbound and Outbound updated successfully!`);
                resolve({ success: true });
            }
        });
    });
});

// APP LIFECYCLE
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
