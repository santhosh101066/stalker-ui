#!/bin/bash

# --- Configuration ---
# Load environment variables from .env if present
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Default Paths (Loaded from .env)
# TIZEN_DIR and SERVER_DIR should be set in .env
SOURCE_DIR="dist/"

# --- Argument Parsing ---
API_HOST="${VITE_API_HOST}"

if [[ "$1" == "--tizen" ]]; then
    # Tizen Mode -> Deploy to Tizen Workspace with Absolute Host
    DEST_DIR="${TIZEN_DIR}"
    echo "ℹ️  Mode: Tizen TV / Absolute Host"
    echo "    Host: $API_HOST"
    echo "    Dest: $DEST_DIR"
else
    # Default Mode -> Deploy to Node.js Server with Relative Path
    API_HOST=""
    DEST_DIR="${SERVER_DIR}"
    echo "ℹ️  Mode: Server / Relative Path"
    echo "    Host: (Relative)"
    echo "    Dest: $DEST_DIR"
fi

# --- Script Start ---
echo "Starting consolidated deployment script..."
echo "Target: $DEST_DIR"

# 1. Build the Vite project
echo "Building Vite project..."
VITE_API_HOST="$API_HOST" npm run build

# Check if the build command was successful
if [ $? -ne 0 ]; then
    echo "Error: npm run build failed. Aborting deployment."
    exit 1
fi

# 2. Check source
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory '$SOURCE_DIR' not found after build. Aborting."
    exit 1
fi

# 3. Prepare destination
if [ ! -d "$DEST_DIR" ]; then
    echo "Creating destination directory '$DEST_DIR'..."
    mkdir -p "$DEST_DIR"
fi

# 4. Clear destination
echo "Clearing destination directory..."
# Safety check: ensure we are not deleting root or something dangerous
if [[ "$DEST_DIR" == *"public"* ]] || [[ "$DEST_DIR" == *"stalker"* ]]; then
    rm -rf "$DEST_DIR"/*
else
    echo "⚠️  Safety warning: Destination '$DEST_DIR' does not look like a standard public folder. Skipping clean."
fi

# 5. Sync files
echo "Syncing files..."
cp -r "$SOURCE_DIR"* "$DEST_DIR"

echo "-----------------------------------------"
echo "✅ Deployment complete!"
echo "Files deployed to: $DEST_DIR"
