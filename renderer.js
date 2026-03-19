const { shell, ipcRenderer } = require('electron');

// Gamma - Ray, HIE
// ----------------------------------------
// NAVIGATION LOGIC
// ----------------------------------------
// Map the button IDs to their corresponding view IDs
const navMap = {
    'nav-setup': 'setup-view',
    'nav-ports': 'ports-view',
    'nav-select': 'select-view',
    'nav-settings': 'settings-view'
};

// Loop through each button and attach a click listener
for (const [btnId, viewId] of Object.entries(navMap)) {
    document.getElementById(btnId).addEventListener('click', (event) => {
        
        // 1. Hide all views
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        
        // 2. Remove 'active' highlight from all sidebar buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        // 3. Show the selected view and highlight the clicked button
        document.getElementById(viewId).classList.add('active');
        event.target.classList.add('active');
    });
}

// ----------------------------------------
// SETTINGS LOGIC
// ----------------------------------------

// Listen for Theme dropdown changes
document.getElementById('themeSelect').addEventListener('change', (event) => {
    if (event.target.value === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
});

// Listen for Font Size slider changes
document.getElementById('fontSizeSlider').addEventListener('input', (event) => {
    const size = event.target.value;
    document.documentElement.style.setProperty('--base-font-size', size + 'px');
    document.getElementById('fontSizeDisplay').innerText = size + 'px';
});

// Listen for the Website button click
document.getElementById('websiteBtn').addEventListener('click', () => {
    shell.openExternal('http://placeholder.com');
});

// ----------------------------------------
// DYNAMIC VERSION FETCHING (Vanilla & Paper)
// ----------------------------------------
const softwareSelect = document.getElementById('softwareSelect');
const versionSelect = document.getElementById('versionSelect');

// Listen for when the user changes the software type (e.g., from Vanilla to Paper)
softwareSelect.addEventListener('change', () => {
    loadVersions(softwareSelect.value);
});

async function loadVersions(softwareType) {
    versionSelect.innerHTML = '<option>Loading versions...</option>';
    
    try {
        if (softwareType === 'vanilla') {
            await fetchVanillaVersions();
        } 
        else if (softwareType === 'paper' || softwareType === 'folia') {
            await fetchPaperMCVersions(softwareType);
        }
        else if (softwareType === 'fabric') {
            await fetchFabricVersions();
        }
        else {
            versionSelect.innerHTML = `<option value="wip">API connection for ${softwareType} coming soon!</option>`;
        }
    } catch (error) {
        console.error(`[ERROR] Failed to load ${softwareType} versions:`, error);
        versionSelect.innerHTML = '<option>Error loading versions</option>';
    }
}

// --- MOJANG API (VANILLA) ---
async function fetchVanillaVersions() {
    const response = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
    const data = await response.json();
    const officialReleases = data.versions.filter(v => v.type === 'release');
    
    versionSelect.innerHTML = ''; 
    officialReleases.forEach(version => {
        const option = document.createElement('option');
        option.textContent = version.id;
        option.value = version.url; 
        versionSelect.appendChild(option);
    });
}

// --- PAPERMC API (PAPER & FOLIA) ---
async function fetchPaperMCVersions(project) {
    const response = await fetch(`https://api.papermc.io/v2/projects/${project}`);
    const data = await response.json();
    
    versionSelect.innerHTML = ''; 
    const versions = data.versions.reverse();
    
    versions.forEach(version => {
        const option = document.createElement('option');
        option.textContent = version;
        option.value = version; 
        versionSelect.appendChild(option);
    });
}

// --- FABRIC API ---
async function fetchFabricVersions() {
    // Fabric's endpoint for all supported game versions
    const response = await fetch('https://meta.fabricmc.net/v2/versions/game');
    const data = await response.json();
    
    versionSelect.innerHTML = ''; // Clear dropdown
    
    // Fabric lists every snapshot ever made. Let's filter for just stable releases to keep it clean!
    const stableVersions = data.filter(v => v.stable === true);
    
    stableVersions.forEach(version => {
        const option = document.createElement('option');
        option.textContent = version.version;
        // We save just the version number (e.g., "1.20.4"). We'll use this later to fetch the jar.
        option.value = version.version; 
        versionSelect.appendChild(option);
    });
}

// Call this once when the app starts so it loads Vanilla by default
loadVersions('vanilla');

// ----------------------------------------
// DIRECTORY SELECTION LOGIC
// ----------------------------------------
// We will store this variable globally so we can use it when we click "Create Server"
let customModDirectory = null; 

document.getElementById('selectModDirBtn').addEventListener('click', async () => {
    // 1. Call the backend via IPC and wait for the result
    const folderPath = await ipcRenderer.invoke('dialog:openDirectory');
    
    // 2. If the user actually selected a folder (and didn't hit cancel)
    if (folderPath) {
        customModDirectory = folderPath;
        
        // 3. Update the UI to show the chosen path
        const pathDisplay = document.getElementById('modDirPath');
        pathDisplay.innerText = folderPath;
        pathDisplay.style.opacity = '1';
        pathDisplay.style.color = 'var(--accent-color)';
    }
});

// ----------------------------------------
// CREATE SERVER LOGIC
// ----------------------------------------
document.getElementById('createServerBtn').addEventListener('click', async () => {
    // 1. Gather all the data from the UI
    const serverData = {
        name: document.getElementById('serverName').value.trim(),
        port: document.getElementById('serverPort').value,
        ram: document.getElementById('ramAmount').value,
        software: document.getElementById('softwareSelect').value,
        // We grab the text of the selected option (e.g., "1.20.4")
        version: document.getElementById('versionSelect').options[document.getElementById('versionSelect').selectedIndex].text,
        // We grab the hidden URL we stored in the value attribute
        downloadUrl: document.getElementById('versionSelect').value,
        customModsPath: customModDirectory // The global variable from our Folder Picker
    };

    // Basic validation
    if (!serverData.name) {
        alert("Please enter a server name!");
        return;
    }

    // Change button text to show it's working
    const btn = document.getElementById('createServerBtn');
    btn.innerText = "Creating Server... Please Wait";
    btn.disabled = true;

    // 2. Send the data to the backend to actually build the folder
    const response = await ipcRenderer.invoke('server:create', serverData);

    if (response.success) {
        alert(`Success! ${serverData.name} has been created.`);
        
        // Unhide the "My Servers" tab!
        document.getElementById('nav-select').style.display = 'block';
        addServerCardToUI(serverData.name, serverData.version, serverData.software);
        
        // Reset the UI
        btn.innerText = "Create Server";
        btn.disabled = false;
        document.getElementById('serverName').value = '';
    } else {
        alert("Error creating server: " + response.error);
        btn.innerText = "Create Server";
        btn.disabled = false;
    }
});

// ----------------------------------------
// UI: DYNAMIC SERVER CARDS
// ----------------------------------------
function addServerCardToUI(serverName, version, software, port) {
    const container = document.getElementById('serverListContainer');

    // 1. Build the HTML structure for the card
    const card = document.createElement('div');
    card.className = 'server-card';
    card.id = `card-${serverName}`;

    card.innerHTML = `
        <div class="server-header">
            <div>
                <h3 style="margin: 0;"><span class="status-indicator" id="status-${serverName}"></span> ${serverName}</h3>
                <span style="font-size: 0.85em; opacity: 0.7;">${software} - ${version} | Port: <b style="color: var(--accent-color);">${port}</b></span>
            </div>
            <div>
                <button class="action-btn" id="start-${serverName}" style="background: #28a745;">Start</button>
                <button class="action-btn" id="stop-${serverName}" style="background: #dc3545; display: none;">Stop</button>
                <button class="action-btn" id="folder-${serverName}" style="background: #17a2b8;">Folder</button>
                <button class="action-btn" id="toggle-${serverName}" style="background: #6c757d;">Console</button>
            </div>
        </div>

        <div class="server-console-area" id="console-area-${serverName}">
            <div class="live-log" id="log-${serverName}">Waiting for server to start...<br></div>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="cmd-${serverName}" placeholder="e.g. op username" style="flex-grow: 1; margin: 0;">
                <button class="action-btn" id="send-${serverName}" style="margin: 0;">Send</button>
            </div>
        </div>
    `;

    container.appendChild(card);

    // 2. Wire up the Expand/Collapse Console button
    document.getElementById(`toggle-${serverName}`).addEventListener('click', () => {
        const consoleArea = document.getElementById(`console-area-${serverName}`);
        if (consoleArea.style.display === 'none' || consoleArea.style.display === '') {
            consoleArea.style.display = 'block';
        } else {
            consoleArea.style.display = 'none';
        }
    });

    // 3. Wire up the Start button
    document.getElementById(`start-${serverName}`).addEventListener('click', async () => {
        document.getElementById(`status-${serverName}`).style.background = '#ffc107'; // Yellow for booting
        document.getElementById(`start-${serverName}`).style.display = 'none';
        document.getElementById(`stop-${serverName}`).style.display = 'inline-block';
        
        await ipcRenderer.invoke('server:start', serverName);
    });

    // 4. Wire up the Stop button
    document.getElementById(`stop-${serverName}`).addEventListener('click', async () => {
        await ipcRenderer.invoke('server:stop', serverName);
    });

    // 5. Wire up the Command Input
    document.getElementById(`send-${serverName}`).addEventListener('click', async () => {
        const inputField = document.getElementById(`cmd-${serverName}`);
        const cmd = inputField.value.trim();
        
        if (cmd) {
            await ipcRenderer.invoke('server:command', { name: serverName, command: cmd });
            inputField.value = ''; // Clear the input box
        }
    });

    // 6. Wire up the Folder button
    document.getElementById(`folder-${serverName}`).addEventListener('click', async () => {
        const response = await ipcRenderer.invoke('server:openFolder', serverName);
        if (!response.success) {
            alert(response.error);
        }
    });
}

// ----------------------------------------
// INCOMING IPC EVENTS (Listening for logs)
// ----------------------------------------
// When the backend sends a live log line, append it to the correct card's console box
ipcRenderer.on('server:log', (event, data) => {
    const { name, log } = data;
    const logBox = document.getElementById(`log-${name}`);
    
    if (logBox) {
        // Change indicator to green to show it's actively running
        document.getElementById(`status-${name}`).style.background = '#28a745'; 
        
        // Add the new text and auto-scroll to the bottom
        logBox.innerHTML += `${log}<br>`;
        logBox.scrollTop = logBox.scrollHeight;
    }
});

// Listen for when a server fully shuts down
ipcRenderer.on('server:status', (event, data) => {
    if (data.status === 'offline') {
        document.getElementById(`status-${data.name}`).style.background = 'gray';
        document.getElementById(`start-${data.name}`).style.display = 'inline-block';
        document.getElementById(`stop-${data.name}`).style.display = 'none';
        document.getElementById(`log-${data.name}`).innerHTML += `[SYSTEM] Server Offline.<br>`;
    }
});

// ----------------------------------------
// STARTUP INITIALIZATION
// ----------------------------------------
async function loadExistingServers() {
    console.log("Scanning for existing servers...");
    
    // 1. Ask the backend for the list of saved servers
    const servers = await ipcRenderer.invoke('server:scan');

    // 2. If we found any servers...
    if (servers.length > 0) {
        // Ensure the "My Servers" tab is visible
        document.getElementById('nav-select').style.display = 'block';

        // Loop through the list and build a card for each one
        servers.forEach(server => {
            addServerCardToUI(server.name, server.version, server.software, server.port);
        });
        
        console.log(`Loaded ${servers.length} servers from disk.`);
    } else {
        // If no servers exist yet, hide the tab to keep the UI clean
        document.getElementById('nav-select').style.display = 'none';
        console.log("No existing servers found.");
    }
}

// Run the scanner immediately when the app opens!
loadExistingServers();

// ----------------------------------------
// FIREWALL / PORT FORWARDING LOGIC
// ----------------------------------------
document.getElementById('autoPortBtn').addEventListener('click', async () => {
    const port = document.getElementById('firewallPort').value;
    if (!port) return alert("Please enter a port number!");

    const btn = document.getElementById('autoPortBtn');
    btn.innerText = "Requesting Admin Permissions...";
    btn.disabled = true;

    // Send the request to the backend
    const response = await ipcRenderer.invoke('firewall:open', port);

    if (response.success) {
        alert(`Success! TCP and UDP port ${port} are now open on this computer's firewall.`);
    } else {
        alert(`Failed to open port: ${response.error}`);
    }

    btn.innerText = "Auto-Configure Firewall";
    btn.disabled = false;
});