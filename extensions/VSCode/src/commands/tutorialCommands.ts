import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { CesiumGlobePanel } from '../cesiumGlobePanel';
import { TutorialsProvider } from '../providers/tutorialsProvider';
import { Logger } from '../utils/logger';
import { FileSystemHelper } from '../utils/fileSystem';
import { TemplateLoader } from '../utils/templateLoader';
import * as constants from '../utils/constants';
import { Tutorial } from '../models/tutorial';

/**
 * Handles all commands related to tutorials
 */
export class TutorialCommandHandler {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly tutorialsProvider: TutorialsProvider
    ) {}

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
            const jsCode = await this.injectAccessToken(tutorial.code.javascript);
            
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

    private async injectAccessToken(jsCode: string): Promise<string> {
        if (!jsCode.includes('YOUR_CESIUM_ION_ACCESS_TOKEN')) {
            return jsCode;
        }

        // Load .env file from extension root
        const envPath = path.join(this.context.extensionPath, '.env');
        dotenv.config({ path: envPath });

        let token = process.env.CESIUM_ION_ACCESS_TOKEN;
        
        // If no token in .env, check global state (stored from previous prompts)
        if (!token) {
            token = this.context.globalState.get<string>('cesiumIonAccessToken');
        }

        // If still no token, prompt user to enter it
        if (!token) {
            token = await this.promptForAccessToken();
        }
        
        if (token) {
            Logger.info('Injecting Cesium Ion access token');
            return jsCode.replace(/YOUR_CESIUM_ION_ACCESS_TOKEN/g, token);
        }
        
        Logger.warn('No Cesium Ion access token available');
        return jsCode;
    }

    private async promptForAccessToken(): Promise<string | undefined> {
        const action = await vscode.window.showWarningMessage(
            'Cesium Ion access token not found. Tutorials may not work without it.',
            'Enter Token',
            'Get Token from Cesium.com',
            'Skip'
        );

        if (action === 'Enter Token') {
            const token = await vscode.window.showInputBox({
                prompt: 'Enter your Cesium Ion access token',
                placeHolder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Token cannot be empty';
                    }
                    if (!value.startsWith('eyJ')) {
                        return 'Invalid token format';
                    }
                    return null;
                }
            });

            if (token) {
                // Save token to global state
                await this.context.globalState.update('cesiumIonAccessToken', token);
                
                // Ask if user wants to save to .env file
                const saveToEnv = await vscode.window.showInformationMessage(
                    'Token saved for this session. Would you like to save it to .env file for future use?',
                    'Yes',
                    'No'
                );

                if (saveToEnv === 'Yes') {
                    await this.saveTokenToEnvFile(token);
                }

                Logger.info('Cesium Ion access token saved');
                return token;
            }
        } else if (action === 'Get Token from Cesium.com') {
            await vscode.env.openExternal(vscode.Uri.parse('https://ion.cesium.com/tokens'));
            // Recursively prompt again after opening the website
            return await this.promptForAccessToken();
        }

        return undefined;
    }

    private async saveTokenToEnvFile(token: string): Promise<void> {
        try {
            const envPath = path.join(this.context.extensionPath, '.env');
            let envContent = '';

            // Read existing .env file if it exists
            try {
                const envUri = vscode.Uri.file(envPath);
                envContent = await FileSystemHelper.readFile(envUri);
            } catch {
                // File doesn't exist, start with template
                envContent = '# Cesium Ion Access Token\n# Get your token from: https://ion.cesium.com/tokens\n';
            }

            // Update or add token
            if (envContent.includes('CESIUM_ION_ACCESS_TOKEN=')) {
                envContent = envContent.replace(
                    /CESIUM_ION_ACCESS_TOKEN=.*/,
                    `CESIUM_ION_ACCESS_TOKEN=${token}`
                );
            } else {
                envContent += `\nCESIUM_ION_ACCESS_TOKEN=${token}\n`;
            }

            // Write back to file
            const envUri = vscode.Uri.file(envPath);
            await FileSystemHelper.writeFile(envUri, envContent);

            vscode.window.showInformationMessage('Token saved to .env file');
            Logger.info('Token saved to .env file');
        } catch (error) {
            Logger.error('Failed to save token to .env file', error);
            vscode.window.showErrorMessage(`Failed to save token to .env file: ${error}`);
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
        const token = await this.promptForAccessToken();
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
            const fileName = FileSystemHelper.basename(uri.fsPath);
            
            // Check if this is a tutorial file
            if (!constants.TUTORIAL_FILES.includes(fileName)) {
                vscode.window.showWarningMessage(constants.MSG_NOT_TUTORIAL_FILE);
                return;
            }
            
            const tutorialDir = FileSystemHelper.dirname(uri.fsPath);

            // Read tutorial files
            const jsPath = vscode.Uri.file(FileSystemHelper.join(tutorialDir, constants.FILE_MAIN_JS));
            const htmlPath = vscode.Uri.file(FileSystemHelper.join(tutorialDir, constants.FILE_INDEX_HTML));
            const cssPath = vscode.Uri.file(FileSystemHelper.join(tutorialDir, constants.FILE_STYLES_CSS));

            let jsCode = '';
            let htmlCode = '';
            let cssCode = '';

            if (await FileSystemHelper.exists(jsPath)) {
                jsCode = await FileSystemHelper.readFile(jsPath);
            }

            if (await FileSystemHelper.exists(htmlPath)) {
                htmlCode = await FileSystemHelper.readFile(htmlPath);
            }

            if (await FileSystemHelper.exists(cssPath)) {
                cssCode = await FileSystemHelper.readFile(cssPath);
            }

            // Inject access token from .env file or prompt user
            jsCode = await this.injectAccessToken(jsCode);

            // Update the Cesium globe view
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

    async handleTutorialFileChange(uri: vscode.Uri): Promise<void> {
        // Only rerender if the Cesium Globe panel is already visible
        if (!CesiumGlobePanel.currentPanel) {
            return;
        }

        const fileName = FileSystemHelper.basename(uri.fsPath);

        // If it's a main tutorial file, reload the tutorial
        if (constants.TUTORIAL_FILES.includes(fileName)) {
            await this.renderTutorialFromFile(uri);
        }
    }

    private async exportTutorialFiles(tutorial: Tutorial): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

            if (!workspaceFolder) {
                vscode.window.showErrorMessage(constants.MSG_OPEN_WORKSPACE_FOLDER);
                return;
            }

            Logger.info('Exporting tutorial files', tutorial.name);

            // Create tutorial folder directly in workspace
            const tutorialSlug = tutorial.slug || this.createSlugFromName(tutorial.name);
            const tutorialPath = vscode.Uri.joinPath(workspaceFolder.uri, tutorialSlug);

            // Create directory
            await FileSystemHelper.createDirectory(tutorialPath);

            // Check if tutorial exists in extension's tutorials folder
            const extensionTutorialPath = vscode.Uri.joinPath(
                this.context.extensionUri,
                constants.FOLDER_TUTORIALS,
                tutorialSlug
            );

            if (await FileSystemHelper.exists(extensionTutorialPath)) {
                // Copy all files from the tutorial folder
                await this.copyTutorialFolder(extensionTutorialPath, tutorialPath);
            } else {
                // Create files from tutorial code object
                await this.createTutorialFiles(tutorial, tutorialPath, tutorialSlug);
            }

            // Create README
            await this.createTutorialReadme(tutorial, tutorialPath, tutorialSlug);

            // Open files in editor
            await this.openTutorialFilesInEditor(tutorialPath);

            // Reveal in file explorer
            await vscode.commands.executeCommand('revealInExplorer', tutorialPath);

            vscode.window.showInformationMessage(`Tutorial exported to: ${tutorialSlug}/`);
            Logger.info('Tutorial exported successfully', tutorial.name);
        } catch (error) {
            Logger.error('Failed to export tutorial', error);
            vscode.window.showErrorMessage(`Failed to export tutorial: ${error}`);
        }
    }

    private async copyTutorialFolder(source: vscode.Uri, destination: vscode.Uri): Promise<void> {
        const entries = await FileSystemHelper.readDirectory(source);

        for (const [name, type] of entries) {
            if (type === vscode.FileType.File) {
                const srcPath = vscode.Uri.joinPath(source, name);
                const destPath = vscode.Uri.joinPath(destination, name);
                await FileSystemHelper.copyFile(srcPath, destPath);
            }
        }
    }

    private async createTutorialFiles(tutorial: Tutorial, tutorialPath: vscode.Uri, tutorialSlug: string): Promise<void> {
        // Save HTML
        const htmlPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_INDEX_HTML);
        await FileSystemHelper.writeFile(htmlPath, tutorial.code.html || '');

        // Save JavaScript
        const jsPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS);
        await FileSystemHelper.writeFile(jsPath, tutorial.code.javascript || '');

        // Save CSS if available
        if (tutorial.code.css) {
            const cssPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_STYLES_CSS);
            await FileSystemHelper.writeFile(cssPath, tutorial.code.css);
        }

        // Create metadata.json
        const metadataPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_METADATA_JSON);
        const metadata = {
            name: tutorial.name,
            slug: tutorialSlug,
            category: tutorial.category || 'Uncategorized',
            description: tutorial.description || ''
        };
        await FileSystemHelper.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    private async createTutorialReadme(tutorial: Tutorial, tutorialPath: vscode.Uri, tutorialSlug: string): Promise<void> {
        try {
            const readmeContent = await TemplateLoader.loadAndReplace(
                this.context.extensionUri,
                'tutorialReadme.md',
                {
                    'TUTORIAL_NAME': tutorial.name,
                    'TUTORIAL_DESCRIPTION': tutorial.description || '',
                    'FILE_INDEX_HTML': constants.FILE_INDEX_HTML,
                    'FILE_MAIN_JS': constants.FILE_MAIN_JS,
                    'FILE_METADATA_JSON': constants.FILE_METADATA_JSON,
                    'CSS_FILE_LINE': tutorial.code.css ? `\n- **${constants.FILE_STYLES_CSS}** - CSS styles for the tutorial` : '',
                    'FOLDER_CESIUM_TUTORIALS': tutorialSlug,
                    'TUTORIAL_SLUG': tutorialSlug,
                    'CSS_FILE_TREE_LINE': tutorial.code.css ? `\n    ├── ${constants.FILE_STYLES_CSS}` : '',
                    'FILE_README_MD': constants.FILE_README_MD
                }
            );

            const readmePath = vscode.Uri.joinPath(tutorialPath, constants.FILE_README_MD);
            await FileSystemHelper.writeFile(readmePath, readmeContent);
        } catch (error) {
            Logger.error('Failed to create tutorial README from template', error);
        }
    }

    private async openTutorialFilesInEditor(tutorialPath: vscode.Uri): Promise<void> {
        const htmlUri = vscode.Uri.joinPath(tutorialPath, constants.FILE_INDEX_HTML);
        const jsUri = vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS);

        const htmlDoc = await vscode.workspace.openTextDocument(htmlUri);
        await vscode.window.showTextDocument(htmlDoc, { preview: false });

        const jsDoc = await vscode.workspace.openTextDocument(jsUri);
        await vscode.window.showTextDocument(jsDoc, { viewColumn: vscode.ViewColumn.Beside });
    }

    private createSlugFromName(name: string): string {
        return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
}
