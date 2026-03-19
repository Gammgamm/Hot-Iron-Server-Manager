# Hot Iron Server Manager - Build Guide

Welcome!  
If you have never used GitHub, Node.js, or compiled a program from source code before, do not worry.  
This guide will walk you through exactly how to turn these code files into a clickable app installer for your computer.

**Please note:** To build the Windows (.exe) installer, you must be on a Windows computer.  
To build the Linux (.rpm) installer, you must be on a Linux computer.

## PART 1: INSTALL THE PREREQUISITES (Node.js & npm)

Before you can build the app, your computer needs a framework called Node.js (which includes a tool called 'npm').
Also, to run an MC server- you WILL need Java 26.

### FOR WINDOWS:
1. Go to the official website: https://nodejs.org/
2. Download the "LTS" (Long Term Support) Windows Installer.
3. Open the downloaded file and click "Next" through the standard installation process.  
   You can leave all the default settings exactly as they are.

### FOR LINUX (Fedora):
1. Open your Terminal.
2. Type the following command and press Enter:  
   `sudo dnf install nodejs npm`
3. Enter your password and type 'y' to confirm the installation.

**(For Ubuntu/Debian Linux users, use:** `sudo apt install nodejs npm`**)**

## PART 2: DOWNLOAD THIS CODE

If you aren't familiar with using 'git' to clone repositories, the easiest way to get this code is to download it directly.

1. At the top of this GitHub page, look for the green button that says "<> Code".
2. Click it, and select "Download ZIP" from the dropdown menu.
3. Extract that ZIP folder somewhere easy to find on your computer, like your Desktop.

## PART 3: PREPARE THE APP

Now we need to tell Node.js to download the background packages (like the firewall tools) that the app needs to run.

1. Open your computer's Terminal / Command Prompt inside the folder you just extracted.  
   - On Windows: Open the folder, click the address bar at the top, type 'cmd', and hit Enter.  
   - On Linux: Open the folder, right-click any empty space, and select "Open in Terminal".
2. In the black terminal window, type this exact command and hit Enter:  
   `npm install`
3. Wait a minute or two. You will see a bunch of text scrolling by as it downloads the necessary files.

## PART 4: TEST THE APP (Optional)

If you want to make sure the app works before you package it into an installer, you can run it directly from the code!

1. In that same terminal window, type:  
   `npm start`
2. The Hot Iron Server Manager should pop open! You can close the app window when you are done looking around.

## PART 5: BUILD THE INSTALLER

This is the final step! We will compress the code and generate a setup file you can share.

### FOR WINDOWS:
1. In your terminal, type this command and hit Enter:  
   `npm run dist`
2. Wait a few minutes for the builder to finish.
3. Once it is done, look inside your project folder. You will see a brand new folder called "release".
4. Inside "release", you will find your shiny new .exe setup file!

### FOR LINUX:
1. In your terminal, type this command and hit Enter:  
   `npm run dist -- --linux`
2. Wait a few minutes for the builder to finish.
3. Once it is done, look inside your project folder for the new "release" folder.
4. Inside "release", you will find your native Linux package (like an .rpm or .deb file) ready to be installed!

## ADDITIONAL INFORMATION

1. Everything in "node_modules" is not owned by or original distributed by Hot Iron Entertainment, nor do we claim ownership of anything within that folder. It is all building blocks that we needed to build this application for the User Experience.

2. I, Ray at HIE, am willing to hire a visual designer.  
   * **NOTE:** We will only pay if it is used...  
   * Send all submissions to HIE.Submissions@gammarays.info  
     > SEE INFO IN SECTION 3!!!  
   * At this moment, I will provide a bounty list for our current needs:  
     > Background imagery -> $25  
     > Icons -> $5 each  
     > Application Icon -> $40  
   * While we aren't opposed to anything, we would prefer it kept to our branding of being more Western.  
   * You will be credited for the artwork!

3. Submission Format for art or design overhauls:  
   * Name to be displayed:  
   * Twitter/X Handle (if any):  
   * Youtube Handle (if any):  
   * Twitch Handle (if any):  
   * Portfolio link (if any):  
   * Submission type (icon, background, etc.):

4. While we do not approve of forking this project, as we plan to add support for different games. We DO accept input, if any code improvements come up- let them be known at the provided email, or on the github.  
   * You will be credited for the change made.

## PLANNED FEATURES

### High Priority
1. Forge & Neoforge server setup and management.
2. Graphical Interface improvements.  
   * Check Additional Information, point 2.

### Low Priority
1. Modpack formatter -- Takes modpacks and strips them down to the bare essentials for a server to run.  
   * Some mods are client-side only and will crash servers, or make them run less effeciently.  
   * Maybe you downloaded too many mods and got carried away?  
     > this shall check to see if they run on the same API.

### KNOWN BUGS
1. App will freeze if user fails to insert a name before hitting "Create Server".  
   * May have overlooked a line of code needed?
2. Servers will not get their port set.
   * To fix this, go to the servers "server.properties" and change "server-port = 25565" to "server-port = <selected-port>"
