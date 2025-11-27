/**
 * Constants used throughout the Cesium Sandcastle extension
 */

export const EXTENSION_ID = 'cesium-sandcastle-extension';
export const EXTENSION_NAME = 'Cesium Sandcastle';

// View IDs
export const VIEW_ID_TUTORIALS = 'cesiumTutorials';
export const VIEW_ID_API_REFERENCE = 'cesiumApiReference';

// Command IDs
export const COMMAND_OPEN_TUTORIAL = 'cesium.openTutorial';
export const COMMAND_OPEN_TUTORIAL_IN_EXPLORER = 'cesium.openTutorialInExplorer';
export const COMMAND_SHOW_GLOBE = 'cesium.showGlobe';
export const COMMAND_REFRESH_TUTORIALS = 'cesium.refreshTutorials';
export const COMMAND_OPEN_API_DOC = 'cesium.openApiDoc';
export const COMMAND_SEARCH_API = 'cesium.searchApi';
export const COMMAND_SEARCH_TUTORIALS = 'cesium.searchTutorials';
export const COMMAND_CLEAR_TUTORIAL_SEARCH = 'cesium.clearTutorialSearch';
export const COMMAND_CLEAR_API_SEARCH = 'cesium.clearApiSearch';
export const COMMAND_RENDER_TUTORIAL_FROM_WORKSPACE = 'cesium.renderTutorialFromWorkspace';
export const COMMAND_SET_CESIUM_TOKEN = 'cesium.setCesiumToken';

// Context values for tree items
export const CONTEXT_VALUE_CATEGORY = 'category';
export const CONTEXT_VALUE_TUTORIAL = 'tutorial';
export const CONTEXT_VALUE_API_ITEM = 'apiItem';

// File names
export const FILE_MAIN_JS = 'main.js';
export const FILE_INDEX_HTML = 'index.html';
export const FILE_STYLES_CSS = 'styles.css';
export const FILE_METADATA_JSON = 'metadata.json';
export const FILE_README_MD = 'README.md';

// Folder names
export const FOLDER_CESIUM_TUTORIALS = 'tutorials';

// File patterns
export const TUTORIAL_FILE_PATTERN = '**/{main.js,index.html,styles.css}';
export const TUTORIAL_FILES = [FILE_MAIN_JS, FILE_INDEX_HTML, FILE_STYLES_CSS];

// URLs
export const CESIUM_API_BASE_URL = 'https://cesium.com/learn/cesiumjs/ref-doc/';

// Messages
export const MSG_EXTENSION_ACTIVATED = 'Cesium Sandcastle extension is now active!';
export const MSG_TUTORIALS_REFRESHED = 'Cesium tutorials refreshed!';
export const MSG_TUTORIAL_CODE_NOT_FOUND = 'Tutorial code not found';
export const MSG_NO_FILE_OPEN = 'No file is currently open';
export const MSG_NOT_TUTORIAL_FILE = 'This file is not a tutorial file (main.js, index.html, or styles.css)';
export const MSG_OPEN_WORKSPACE_FOLDER = 'Please open a workspace folder to save tutorial files';
export const MSG_API_SEARCH_CLEARED = 'API search cleared';
export const MSG_TUTORIAL_SEARCH_CLEARED = 'Tutorial search cleared';
export const MSG_TUTORIALS_DIR_NOT_FOUND = 'Tutorials directory not found';

// Token messages
export const MSG_TOKEN_NOT_FOUND = 'Cesium Ion access token not found. Tutorials may not work without it.';
export const MSG_TOKEN_ACTION_ENTER = 'Enter Token';
export const MSG_TOKEN_ACTION_GET = 'Get Token from Cesium.com';
export const MSG_TOKEN_ACTION_SKIP = 'Skip';
export const MSG_TOKEN_SAVE_TO_ENV = 'Token saved for this session. Would you like to save it to .env file for future use?';
export const MSG_TOKEN_ACTION_YES = 'Yes';
export const MSG_TOKEN_ACTION_NO = 'No';
export const MSG_TOKEN_PROMPT = 'Enter your Cesium Ion access token';
export const MSG_TOKEN_PLACEHOLDER = 'eyJhbGciOiJI...';
export const MSG_TOKEN_EMPTY_ERROR = 'Token cannot be empty';
export const MSG_TOKEN_INVALID_FORMAT = 'Invalid token format';
export const MSG_TOKEN_SAVED_TO_ENV = 'Token saved to .env file';

// NPM project messages
export const MSG_NPM_DEPS_NOT_INSTALLED = 'Dependencies not installed for "{0}". Install now?';
export const MSG_NPM_ACTION_YES_INSTALL = 'Yes, Install';
export const MSG_NPM_ACTION_CANCEL = 'Cancel';
export const MSG_NPM_INSTALLING_DEPS = 'Installing dependencies... Run "npm run dev" when complete, or click Play again.';
export const MSG_NPM_STARTING_SERVER = 'Starting dev server on port {0}...';
export const MSG_NPM_SERVER_READY = 'Dev server ready: {0}';
export const MSG_NPM_SERVER_TIMEOUT = 'Dev server for "{0}" is taking longer than expected. Check the terminal for details.';
