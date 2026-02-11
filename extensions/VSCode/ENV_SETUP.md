# Environment Variables

This extension uses environment variables for sensitive configuration values like API tokens.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your actual values:
   ```bash
   CESIUM_ION_ACCESS_TOKEN=your_actual_token_here
   ```

3. Reload VS Code or restart the extension to load the new token

## Getting a Cesium Ion Access Token

1. Go to [https://ion.cesium.com/tokens](https://ion.cesium.com/tokens)
2. Sign in or create an account
3. Create a new token or use an existing one
4. Copy the token and paste it in your `.env` file

## Automatic Token Injection

The extension **automatically loads** the `CESIUM_ION_ACCESS_TOKEN` from your `.env` file when:

- Opening tutorials from the Cesium Tutorials panel
- Rendering tutorials from workspace files (with auto-reload on file changes)

Tutorial files use the placeholder `YOUR_CESIUM_ION_ACCESS_TOKEN`, which is automatically replaced with your actual token at runtime. You don't need to manually edit the tutorial files!

## Security

- The `.env` file is ignored by git (listed in `.gitignore`)
- Never commit your `.env` file to version control
- Use `.env.example` as a template for required variables
- Share `.env.example` with your team, not `.env`
- Tokens are injected at runtime, not saved to tutorial files
