import * as vscode from 'vscode';
import { TutorialsProvider } from './providers/tutorialsProvider';
import { ApiReferenceProvider } from './providers/apiReferenceProvider';
import { TutorialCommandHandler } from './commands/tutorialCommands';
import { ApiCommandHandler } from './commands/apiCommands';
import { GlobeCommandHandler } from './commands/globeCommands';
import { Logger } from './utils/logger';
import * as constants from './utils/constants';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
    // Initialize logger
    Logger.initialize(constants.EXTENSION_NAME);
    Logger.info(constants.MSG_EXTENSION_ACTIVATED);

    try {
        // Register tree view providers
        const tutorialsProvider = new TutorialsProvider(context.extensionPath);
        const apiReferenceProvider = new ApiReferenceProvider(context.extensionUri);
        
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider(constants.VIEW_ID_TUTORIALS, tutorialsProvider),
            vscode.window.registerTreeDataProvider(constants.VIEW_ID_API_REFERENCE, apiReferenceProvider)
        );

        // Initialize command handlers
        const tutorialCommandHandler = new TutorialCommandHandler(context, tutorialsProvider);
        const apiCommandHandler = new ApiCommandHandler(context, apiReferenceProvider);
        const globeCommandHandler = new GlobeCommandHandler(context);

        // Register all commands
        tutorialCommandHandler.registerCommands();
        apiCommandHandler.registerCommands();
        globeCommandHandler.registerCommands();

        // Set up file watcher for tutorial files
        setupFileWatcher(context, tutorialCommandHandler);

        Logger.info('Extension activated successfully');
    } catch (error) {
        Logger.error('Failed to activate extension', error);
        vscode.window.showErrorMessage(`Failed to activate ${constants.EXTENSION_NAME}: ${error}`);
    }
}

/**
 * Set up file watcher for tutorial files in workspace
 */
function setupFileWatcher(
    context: vscode.ExtensionContext,
    tutorialCommandHandler: TutorialCommandHandler
): void {
    const tutorialWatcher = vscode.workspace.createFileSystemWatcher(constants.TUTORIAL_FILE_PATTERN);

    tutorialWatcher.onDidChange(async (uri: vscode.Uri) => {
        await tutorialCommandHandler.handleTutorialFileChange(uri);
    });

    tutorialWatcher.onDidCreate(async (uri: vscode.Uri) => {
        await tutorialCommandHandler.handleTutorialFileChange(uri);
    });

    context.subscriptions.push(tutorialWatcher);
    Logger.info('File watcher initialized');
}

/**
 * Extension deactivation cleanup
 */
export function deactivate(): void {
    Logger.info('Extension deactivated');
    Logger.dispose();
}
