const fs = require('fs');
const path = require('path');
const https = require('https');

// Gamma - Ray, HIE
function createNewServer(serverName, downloadUrl) {
    // 1. Define a main 'servers' directory and a subfolder for this specific server
    const mainServersDir = path.join(__dirname, 'servers');
    const newServerDir = path.join(mainServersDir, serverName);
    
    // 2. Create the folders if they don't exist
    if (!fs.existsSync(newServerDir)){
        // { recursive: true } ensures it creates both 'servers' AND the subfolder
        fs.mkdirSync(newServerDir, { recursive: true }); 
        console.log(`[SYSTEM] Created new directory for: ${serverName}`);
    }

    // 3. Prepare the file stream
    const jarPath = path.join(newServerDir, 'server.jar');
    const fileStream = fs.createWriteStream(jarPath);

    console.log(`[SYSTEM] Downloading jar file from ${downloadUrl}...`);
    
    // 4. Download the file from your remote server
    https.get(downloadUrl, (response) => {
        
        // Pipe the downloaded data directly into the file we created
        response.pipe(fileStream); 
        
        // When the download finishes...
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`[SYSTEM] Download complete! ${serverName} is ready.`);
            
            // BONUS: Automatically accept the EULA so the user doesn't have to!
            const eulaPath = path.join(newServerDir, 'eula.txt');
            fs.writeFileSync(eulaPath, 'eula=true\n');
            console.log(`[SYSTEM] Auto-generated eula.txt for ${serverName}.`);
        });

    }).on('error', (err) => {
        // If the download fails (e.g., no internet), delete the corrupted empty file
        fs.unlinkSync(jarPath); 
        console.error(`[ERROR] Download failed: ${err.message}`);
    });
}

// This is an official Mojang link for the 1.20.4 vanilla server jar
const testUrl = "https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar";

createNewServer('My_First_Automated_Server', testUrl);