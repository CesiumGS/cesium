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

#### CDN

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

## Testing the Extension

### Prerequisites

- Visual Studio Code 1.85.0 or higher
- Node.js and npm installed
- Cesium Ion access token ([get one here](https://ion.cesium.com/tokens))

### Setup & Build

1. **Navigate to the extension directory:**
   ```bash
   cd extensions/VSCode
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the extension:**
   ```bash
   npm run compile
   ```
   This compiles TypeScript and copies necessary resources to the `out/` directory.

### Running the Extension

1. The `launch.json` is already configured with the **Run VS Code Extension"** configuration
2. Press **F5** (or select **"Run VS Code Extension"** from the Debug dropdown) to launch the Extension Development Host
3. A new VS Code window will open with the extension loaded (Cesium logo should be visible in the Activity Bar)

### Manual Testing Checklist

#### ✅ Tutorials Panel

- [ ] Cesium icon appears in the Activity Bar
- [ ] Tutorials panel opens when clicking the Cesium icon
- [ ] Tutorials are organized by category
- [ ] Search functionality filters tutorials correctly
- [ ] Export button appears on tutorial items

#### ✅ Tutorial Export

- [ ] Export tutorial as npm project (creates Vite setup with proper structure)
- [ ] Export tutorial as CDN format (creates simple HTML file)
- [ ] `.env` file is created with token placeholder for npm projects
- [ ] Token prompt appears if not configured

#### ✅ Cesium Globe Viewer

- [ ] "Render Cesium View" command appears in editor title bar for `.js`, `.html`, `.css` files
- [ ] Globe renders correctly for npm projects (launches dev server)
- [ ] Globe renders correctly for CDN projects
- [ ] Live reload works when saving file changes

#### ✅ Token Management

- [ ] Token prompt appears when opening tutorial without configured token
- [ ] "Set Cesium Ion Access Token" command works from Command Palette
- [ ] Token persists across sessions

#### ✅ Dev Server Integration

- [ ] Vite dev server starts automatically for npm projects
- [ ] Port is automatically detected and available
- [ ] Server stops properly when closing the viewer

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial release with basic tutorial browsing and globe visualization.
