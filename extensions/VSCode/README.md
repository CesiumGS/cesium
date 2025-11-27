# Cesium Sandcastle Extension

A Visual Studio Code extension that provides access to Cesium Sandcastle tutorials and allows you to visualize the Cesium globe directly in the editor.

## Features

- **📚 Tutorials Browser**: Browse Cesium Sandcastle tutorials organized by category
- **🔍 Tutorial Search**: Quick filtering by name or keyword
- **📦 Tutorial Export**: Export tutorials as modern npm projects or legacy CDN format
- **🌍 Cesium Globe Viewer**: Render and preview Cesium scenes inside VS Code
- **⚡ Live Reload**: Auto-refresh on file changes for both npm and CDN projects
- **🎯 Smart Project Detection**: Automatically detects Cesium code in any workspace file
- **🚀 Dev Server Integration**: Automatic Vite dev server with dynamic port detection

## Usage

### Browsing Tutorials

1. Click on the **Cesium icon** in the Activity Bar to open the Tutorials panel
2. Browse tutorials organized by category
3. Use the **search icon** to filter tutorials by name or keyword
4. Click **"Export Tutorial to Workspace"** button to export a tutorial to your workspace

### Exporting Tutorials

When exporting a tutorial, choose your preferred format:

**Modern npm Project** (Recommended)
- Full Vite + Cesium ES modules setup
- IntelliSense and TypeScript support
- Hot Module Replacement (HMR)
- Run with `npm install` then `npm run dev`
- Token stored securely in `.env` file

**CDN**
- Simple HTML with Cesium CDN links
- No build step required
- Open `index.html` directly in browser
- Token hardcoded in `main.js`

### Rendering Cesium Views

**From Tutorials Panel:**
- Click any tutorial to open it in the Cesium Globe viewer

**From Workspace Files:**
- Right-click on any `.js`, `.html`, or `.css` file
- Select **"Render Cesium View"**
- Works with both npm and CDN projects
- Auto-detects Cesium code and project type

**For npm Projects:**
- Dev server starts automatically on available port
- Opens in VS Code Simple Browser
- Live reload on file changes

**For CDN Projects:**
- Renders directly in Cesium Globe panel
- Live updates when you save files

## Requirements

- Visual Studio Code 1.85.0 or higher

## Configuration

### Setting Up Cesium Ion Access Token

Tutorials require a Cesium Ion access token to work properly. You have two options:

1. **Automatic Prompt** (Recommended)
   - Open any tutorial - you'll be prompted to enter your token
   - Token is saved for future use

2. **Manual Setup via .env File**
   - Copy `.env.example` to `.env` in the extension directory
   - Add your token: `CESIUM_ION_ACCESS_TOKEN=your_token_here`
   - Get your token from: [https://ion.cesium.com/tokens](https://ion.cesium.com/tokens)

3. **Command Palette**
   - Run `Cesium: Set Cesium Ion Access Token` from Command Palette
   - Enter your token when prompted

See [ENV_SETUP.md](ENV_SETUP.md) for detailed instructions.

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial release with basic tutorial browsing and globe visualization.
