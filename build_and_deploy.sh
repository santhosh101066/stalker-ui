#!/bin/bash

# ==========================================
# Stalker UI to Server Deployment Script
# (Run this from INSIDE the stalker-ui folder)
# ==========================================

# --- Configuration ---

# Path to the UI project (Current Directory)
UI_DIR="."

# Path to the Server project
# We assume the server folder is a sibling (next to) this UI folder.
# If your folder name is different (e.g., stalker-server), change it here.
SERVER_DIR="../stalker-m3u-server"

# The specific folder in the server where static files are served
SERVER_PUBLIC_DIR="$SERVER_DIR/public"

# --- Colors for Output ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- Helper Function ---
print_step() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

# --- 1. Validation ---
print_step "Validating Paths"

# Check if we are actually in the UI folder (look for package.json)
if [ ! -f "$UI_DIR/package.json" ]; then
    echo -e "${RED}Error: Cannot find package.json.${NC}"
    echo "Make sure you are running this script from inside the 'stalker-ui' folder."
    exit 1
fi

# Check if the server folder exists as a sibling
if [ ! -d "$SERVER_DIR" ]; then
    echo -e "${RED}Error: Server directory not found at: $SERVER_DIR${NC}"
    echo "This script assumes 'stalker-m3u-server' is located next to 'stalker-ui'."
    echo "Please update the SERVER_DIR variable in this script if your path is different."
    exit 1
fi

echo -e "${GREEN}Paths validated.${NC}"

# --- 2. Build UI ---
print_step "Building UI"

# No need to cd, we are already here.

echo "Running npm install..."
# npm install --silent # Uncomment if you want to ensure dependencies are always fresh

echo "Running npm run build..."
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Stopping deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful.${NC}"

# --- 3. Deploy to Server ---
print_step "Deploying to Server"

# Ensure target directory exists
if [ ! -d "$SERVER_PUBLIC_DIR" ]; then
    echo "Creating public directory at $SERVER_PUBLIC_DIR..."
    mkdir -p "$SERVER_PUBLIC_DIR"
fi

# Clear old files
echo "Cleaning old files from server public folder..."
# Safety: verify we aren't deleting something wrong
if [[ "$SERVER_PUBLIC_DIR" == *"public"* ]]; then
    rm -rf "$SERVER_PUBLIC_DIR"/*
else
    echo -e "${RED}Safety Check Failed: Target directory does not look like a public folder.${NC}"
    exit 1
fi

# Copy new files
echo "Copying new build artifacts..."
cp -r dist/* "$SERVER_PUBLIC_DIR"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Files copied successfully!${NC}"
else
    echo -e "${RED}Failed to copy files.${NC}"
    exit 1
fi

# --- 4. Conclusion ---
print_step "Done"
echo -e "${GREEN}UI has been built and deployed to: $SERVER_PUBLIC_DIR${NC}"
echo "You can now go to the server folder and run your Docker build or start script."