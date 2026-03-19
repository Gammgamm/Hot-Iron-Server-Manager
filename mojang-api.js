// The official v2 Mojang Version Manifest
const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

// Gamma - Ray, HIE
// -----------------------------------
// STEP 1: Get the list of versions for the Dropdown
// -----------------------------------
async function getDropdownVersions() {
    console.log("[API] Fetching version list from Mojang...");
    
    try {
        const response = await fetch(MANIFEST_URL);
        const data = await response.json();
        
        // The API returns snapshots, alphas, and betas. 
        // Let's filter it so we only show official "release" versions in our menu.
        const officialReleases = data.versions.filter(version => version.type === 'release');
        
        console.log(`[API] Successfully found ${officialReleases.length} official releases!`);
        
        // Let's log the 3 most recent versions just to see what they look like
        console.log("\n--- Top 3 Recent Versions ---");
        for (let i = 0; i < 3; i++) {
            console.log(`Version: ${officialReleases[i].id}`);
            console.log(`Metadata URL: ${officialReleases[i].url}\n`);
        }
        
        return officialReleases;

    } catch (error) {
        console.error("[ERROR] Could not connect to Mojang API:", error);
    }
}

// -----------------------------------
// STEP 2: Get the actual .jar download link
// -----------------------------------
async function getJarDownloadLink(metadataUrl) {
    console.log("[API] Fetching specific server.jar link...");
    
    try {
        const response = await fetch(metadataUrl);
        const versionData = await response.json();
        
        // Navigate through the JSON to find the exact server download URL
        const downloadUrl = versionData.downloads.server.url;
        
        console.log(`[API] Success! The direct download link is: \n${downloadUrl}`);
        return downloadUrl;

    } catch (error) {
        console.error("[ERROR] Could not find server jar for this version:", error);
    }
}

async function testMojangAPI() {
    // 1. Get the master list
    const allVersions = await getDropdownVersions();
    
    // 2. Pretend the user clicked the very first item in the dropdown (the newest version)
    const userSelectedVersion = allVersions[0]; 
    console.log(`\n[SYSTEM] Simulating user selecting version ${userSelectedVersion.id}...`);
    
    // 3. Take the metadata URL from that selection and get the .jar link
    const finalJarLink = await getJarDownloadLink(userSelectedVersion.url);
    
    // In your final app, you would now pass this 'finalJarLink' directly into 
    // the 'createNewServer()' download function we built in the previous step!
}

// Run the test
testMojangAPI();