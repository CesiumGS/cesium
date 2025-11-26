# Cesium Sandcastle Extension

A Visual Studio Code extension that provides access to Cesium Sandcastle tutorials and allows you to visualize the Cesium globe directly in the editor.

## Features

- **Tutorials Browser**: Browse and access Cesium Sandcastle tutorials organized by category
- **Quick Access**: Open tutorial code directly in VS Code
- **Cesium Globe Viewer**: Visualize Cesium globe with tutorial examples in a webview panel

## Usage

1. Click on the Cesium icon in the Activity Bar to open the Tutorials panel
2. Browse through the available tutorials
3. Click on a tutorial to open its code in the editor
4. Click the globe icon to view the Cesium globe with your code

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
