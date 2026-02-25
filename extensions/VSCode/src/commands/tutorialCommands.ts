import * as vscode from 'vscode';
import { CesiumGlobePanel } from '../panels/cesiumGlobePanel';
import { TutorialsProvider } from '../providers/tutorialsProvider';
import { Logger } from '../utils/logger';
import { FileSystemHelper } from '../utils/fileSystem';
import { TokenManager } from '../utils/managers/tokenManager';
import { FormatConverter } from '../utils/managers/formatConverter';
import { TutorialFileManager } from '../utils/managers/tutorialFileManager';
import { NpmProjectManager } from '../utils/managers/npmProjectManager';
import { CesiumProjectDetector } from '../utils/cesiumProjectDetector';
import * as constants from '../utils/constants';
import { Tutorial } from '../models/tutorial';

/**
 * Handles all commands related to tutorials
 */
export class TutorialCommandHandler {
    private readonly tokenManager: TokenManager;
    private readonly formatConverter: FormatConverter;
    private readonly fileManager: TutorialFileManager;
    private readonly npmManager: NpmProjectManager;

    private cesiumProjectCache = new Map<string, boolean>();


    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly tutorialsProvider: TutorialsProvider
    ) {
        this.tokenManager = new TokenManager(context);
        this.formatConverter = new FormatConverter(context.extensionUri);
        this.fileManager = new TutorialFileManager(context.extensionUri);
        this.npmManager = new NpmProjectManager();
    }

    /**
     * Register all tutorial-related commands
     */
    registerCommands(): void {
        this.context.subscriptions.push(
            vscode.commands.registerCommand(constants.COMMAND_REFRESH_TUTORIALS, () => this.refreshTutorials()),
            vscode.commands.registerCommand(constants.COMMAND_OPEN_TUTORIAL, (tutorial) => this.openTutorial(tutorial)),
            vscode.commands.registerCommand(constants.COMMAND_OPEN_TUTORIAL_IN_EXPLORER, (treeItem) => this.openTutorialInExplorer(treeItem)),
            vscode.commands.registerCommand(constants.COMMAND_SEARCH_TUTORIALS, () => this.searchTutorials()),
            vscode.commands.registerCommand(constants.COMMAND_CLEAR_TUTORIAL_SEARCH, () => this.clearTutorialSearch()),
            vscode.commands.registerCommand(constants.COMMAND_RENDER_TUTORIAL_FROM_WORKSPACE, () => this.renderTutorialFromWorkspace()),
            vscode.commands.registerCommand(constants.COMMAND_SET_CESIUM_TOKEN, () => this.setCesiumToken())
        );
    }

    private refreshTutorials(): void {
        Logger.info('Refreshing tutorials');
        this.tutorialsProvider.refresh();
        vscode.window.showInformationMessage(constants.MSG_TUTORIALS_REFRESHED);
    }

    private async openTutorial(tutorial: any): Promise<void> {
        Logger.info('Opening tutorial', tutorial?.name || 'unknown');
        
        if (tutorial && tutorial.code) {
            // Inject access token from .env file or prompt user
            const jsCode = await this.tokenManager.injectAccessToken(tutorial.code.javascript);
            
            CesiumGlobePanel.createOrShow(
                this.context.extensionUri,
                jsCode,
                tutorial.code.html,
                tutorial.code.css
            );
        } else {
            Logger.error('Tutorial code not found', tutorial);
            vscode.window.showErrorMessage(constants.MSG_TUTORIAL_CODE_NOT_FOUND);
        }
    }

    private async openTutorialInExplorer(treeItem: any): Promise<void> {
        if (treeItem && treeItem.tutorial) {
            await this.exportTutorialFiles(treeItem.tutorial);
        }
    }

    private async searchTutorials(): Promise<void> {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Search Cesium Tutorials',
            placeHolder: 'Enter tutorial name, category, or keyword...'
        });

        if (searchTerm !== undefined) {
            Logger.info('Searching tutorials', searchTerm);
            this.tutorialsProvider.setSearchQuery(searchTerm);
            if (searchTerm) {
                vscode.window.showInformationMessage(`Filtered tutorials: "${searchTerm}"`);
            }
        }
    }

    private clearTutorialSearch(): void {
        Logger.info('Clearing tutorial search');
        this.tutorialsProvider.clearSearch();
        vscode.window.showInformationMessage(constants.MSG_TUTORIAL_SEARCH_CLEARED);
    }

    private async setCesiumToken(): Promise<void> {
        const token = await this.tokenManager.promptForAccessToken();
        if (token) {
            vscode.window.showInformationMessage('Cesium Ion access token has been set successfully');
        }
    }

    private async renderTutorialFromWorkspace(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage(constants.MSG_NO_FILE_OPEN);
            return;
        }

        await this.renderTutorialFromFile(editor.document.uri);
    }

    async renderTutorialFromFile(uri: vscode.Uri): Promise<void> {
        try {
            const filePath = uri.fsPath;
            const tutorialDir = FileSystemHelper.dirname(filePath);
            
            // Check if this file is part of a Cesium project
            const isCesiumProject = await CesiumProjectDetector.isPartOfCesiumProject(filePath);
            if (!isCesiumProject) {
                vscode.window.showWarningMessage(
                    'This file does not appear to be part of a Cesium project. ' +
                    'Make sure your code contains Cesium references (e.g., Cesium.Viewer, import from cesium).'
                );
                return;
            }

            // Find all relevant Cesium files in the directory
            const cesiumFiles = await CesiumProjectDetector.findCesiumFiles(tutorialDir);
            
            if (!cesiumFiles.jsFile && !cesiumFiles.htmlFile) {
                vscode.window.showWarningMessage('Could not find JavaScript or HTML files in this directory.');
                return;
            }

            // Check if this is an npm project
            const isNpmProject = await this.npmManager.isNpmProject(tutorialDir);

            // Read project files
            let jsCode = '';
            let htmlCode = '';
            let cssCode = '';

            if (cesiumFiles.jsFile) {
                jsCode = await FileSystemHelper.readFile(cesiumFiles.jsFile);
            }

            if (cesiumFiles.htmlFile) {
                htmlCode = await FileSystemHelper.readFile(cesiumFiles.htmlFile);
            }

            if (cesiumFiles.cssFile) {
                cssCode = await FileSystemHelper.readFile(cesiumFiles.cssFile);
            }

            // For npm projects, start dev server
            if (isNpmProject) {
                const tutorialName = FileSystemHelper.basename(tutorialDir);
                await this.npmManager.startDevServer(tutorialDir, tutorialName);
                return;
            }

            // For CDN projects, inject token and render in globe view
            jsCode = await this.tokenManager.injectAccessToken(jsCode);
            CesiumGlobePanel.createOrShow(this.context.extensionUri, jsCode, htmlCode, cssCode);

            // Show notification for manual renders
            const tutorialName = FileSystemHelper.basename(tutorialDir);
            vscode.window.showInformationMessage(`Rendered: ${tutorialName}`);
            Logger.info('Rendered tutorial from workspace', tutorialName);
        } catch (error) {
            Logger.error('Failed to render tutorial', error);
            vscode.window.showErrorMessage(`Failed to render tutorial: ${error}`);
        }
    }

    /**
     * Clear the Cesium project cache for a specific directory
     */
    private clearProjectCache(directoryPath?: string): void {
        if (directoryPath) {
            this.cesiumProjectCache.delete(directoryPath);
        } else {
            this.cesiumProjectCache.clear();
        }
    }

    async handleTutorialFileChange(uri: vscode.Uri): Promise<void> {
        // Only rerender if the Cesium Globe panel is already visible
        if (!CesiumGlobePanel.currentPanel) {
            return;
        }

        const directory = FileSystemHelper.dirname(uri.fsPath);
        
        // Check cache first to avoid expensive directory scans
        let isCesiumProject = this.cesiumProjectCache.get(directory);
        
        if (isCesiumProject === undefined) {
            // Not in cache, do the expensive check
            isCesiumProject = await CesiumProjectDetector.isPartOfCesiumProject(uri.fsPath);
            this.cesiumProjectCache.set(directory, isCesiumProject);
        }
    }

    private async exportTutorialFiles(tutorial: Tutorial): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

            if (!workspaceFolder) {
                vscode.window.showErrorMessage(constants.MSG_OPEN_WORKSPACE_FOLDER);
                return;
            }

            // Ask user to select export format
            const format = await vscode.window.showQuickPick(
                [
                    {
                        label: 'Modern npm Project',
                        description: 'Vite + cesium with ES6 imports (recommended)',
                        detail: 'Full IntelliSense support, modern dev workflow with HMR',
                        value: 'npm'
                    },
                    {
                        label: 'CDN',
                        description: 'Simple HTML with Cesium CDN',
                        detail: 'Traditional format with global Cesium object',
                        value: 'cdn'
                    }
                ],
                {
                    placeHolder: 'Choose export format',
                    ignoreFocusOut: true
                }
            );

            if (!format) {
                return; // User cancelled
            }

            Logger.info('Exporting tutorial files', tutorial.name, format.value);

            // Create tutorial folder directly in workspace
            const tutorialSlug = tutorial.slug || this.fileManager.createSlugFromName(tutorial.name);
            const tutorialPath = vscode.Uri.joinPath(workspaceFolder.uri, tutorialSlug);

            // Create directory
            await FileSystemHelper.createDirectory(tutorialPath);

            // Check if tutorial exists in extension's tutorials folder
            const extensionTutorialPath = vscode.Uri.joinPath(
                this.context.extensionUri,
                constants.FOLDER_CESIUM_TUTORIALS,
                tutorialSlug
            );

            if (await FileSystemHelper.exists(extensionTutorialPath)) {
                // Copy all files from the tutorial folder
                await this.fileManager.copyTutorialFolder(extensionTutorialPath, tutorialPath);
                
                // If user chose npm format and copied tutorial has package.json, it's already npm format
                // If user chose npm but copied tutorial is CDN format, convert it
                const copiedPackageJson = vscode.Uri.joinPath(tutorialPath, 'package.json');
                const isNpmFormat = await FileSystemHelper.exists(copiedPackageJson);
                
                if (format.value === 'npm' && !isNpmFormat) {
                    // Convert copied CDN files to npm format
                    const token = await this.tokenManager.getAccessToken();
                    await this.formatConverter.convertCdnToNpm(tutorialPath, tutorialSlug, token);
                } else if (format.value === 'cdn' && isNpmFormat) {
                    // Convert copied npm files to CDN format
                    await this.formatConverter.convertNpmToCdn(tutorialPath);
                } else if (format.value === 'cdn' && !isNpmFormat) {
                    // Copied tutorial is already CDN format, but we need to inject the token
                    const mainJsPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS);
                    if (await FileSystemHelper.exists(mainJsPath)) {
                        let jsCode = await FileSystemHelper.readFile(mainJsPath);
                        jsCode = await this.tokenManager.injectAccessToken(jsCode);
                        await FileSystemHelper.writeFile(mainJsPath, jsCode);
                    }
                }
            } else {
                // Create files based on selected format
                if (format.value === 'npm') {
                    const token = await this.tokenManager.getAccessToken();
                    const convertedCode = this.formatConverter.removeTokenAssignments(tutorial.code.javascript || '');
                    await this.fileManager.createNpmProjectFiles(tutorial, tutorialPath, tutorialSlug, token, convertedCode);
                } else {
                    const jsCode = await this.tokenManager.injectAccessToken(tutorial.code.javascript || '');
                    await this.fileManager.createLegacyCdnFiles(tutorial, tutorialPath, jsCode);
                }
            }

            // Create README
            await this.fileManager.createTutorialReadme(tutorial, tutorialPath, format.value === 'npm');

            // Open files in editor
            await this.fileManager.openTutorialFilesInEditor(tutorialPath);

            // Reveal in file explorer
            await vscode.commands.executeCommand('revealInExplorer', tutorialPath);

            // Clear cache for the new tutorial directory so it gets detected immediately
            this.clearProjectCache(tutorialPath.fsPath);

            vscode.window.showInformationMessage(`Tutorial exported to: ${tutorialSlug}/`);
            Logger.info('Tutorial exported successfully', tutorial.name);
        } catch (error) {
            Logger.error('Failed to export tutorial', error);
            vscode.window.showErrorMessage(`Failed to export tutorial: ${error}`);
        }
    }
}
