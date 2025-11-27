import * as vscode from 'vscode';
import { FileSystemHelper } from '../fileSystem';
import { PortDetector } from '../portDetector';
import { Logger } from '../logger';
import * as constants from '../constants';

/**
 * Manages npm project operations like dev server, installations, etc.
 */
export class NpmProjectManager {
    /**
     * Check if node_modules exists in a directory
     */
    private async hasNodeModules(tutorialDir: string): Promise<boolean> {
        const nodeModulesPath = FileSystemHelper.join(tutorialDir, 'node_modules');
        const nodeModulesUri = vscode.Uri.file(nodeModulesPath);
        return await FileSystemHelper.exists(nodeModulesUri);
    }

    /**
     * Install npm dependencies in a tutorial directory
     */
    private async installDependencies(tutorialDir: string, tutorialName: string): Promise<vscode.Terminal> {
        const terminal = vscode.window.createTerminal({
            name: `npm install - ${tutorialName}`,
            cwd: tutorialDir
        });
        terminal.show();
        terminal.sendText('npm install');
        
        return terminal;
    }

    /**
     * Start the npm dev server for a tutorial
     */
    public async startDevServer(tutorialDir: string, tutorialName: string): Promise<void> {
        // Check if dependencies are installed
        const hasModules = await this.hasNodeModules(tutorialDir);
        
        if (!hasModules) {
            const install = await vscode.window.showInformationMessage(
                constants.MSG_NPM_DEPS_NOT_INSTALLED.replace('{0}', tutorialName),
                constants.MSG_NPM_ACTION_YES_INSTALL,
                constants.MSG_NPM_ACTION_CANCEL
            );
            
            if (install !== constants.MSG_NPM_ACTION_YES_INSTALL) {
                return;
            }
            
            // Run npm install and show message
            await this.installDependencies(tutorialDir, tutorialName);
            
            vscode.window.showInformationMessage(
                constants.MSG_NPM_INSTALLING_DEPS
            );
            return;
        }
        
        // Find available port
        const port = await PortDetector.findAvailablePort();
        Logger.info(`Found available port: ${port}`);
        
        // Start dev server with custom port
        const terminal = vscode.window.createTerminal({
            name: `Vite Dev - ${tutorialName}`,
            cwd: tutorialDir
        });
        terminal.show();
        
        // Send command - use npx vite directly to avoid npm script argument passing issues
        Logger.info(`Starting dev server with command: npx vite --port ${port}`);
        terminal.sendText(`npx vite --port ${port}`);
        
        // Wait for port to be ready before opening browser
        await this.waitAndOpenBrowser(port, tutorialName);
    }

    /**
     * Check if a directory is an npm project
     */
    public async isNpmProject(tutorialDir: string): Promise<boolean> {
        const packageJsonPath = vscode.Uri.file(FileSystemHelper.join(tutorialDir, 'package.json'));
        return await FileSystemHelper.exists(packageJsonPath);
    }

    /**
     * Wait for server to start and open browser
     */
    private async waitAndOpenBrowser(port: number, tutorialName: string): Promise<void> {
        vscode.window.showInformationMessage(
            constants.MSG_NPM_STARTING_SERVER.replace('{0}', port.toString())
        );
        
        // Wait up to 60 seconds for server to start (increased for Vite + dependency bundling)
        const serverStarted = await PortDetector.waitForPort(port, 60000, 1000);
        
        if (serverStarted) {
            Logger.info(`Server started on port ${port}`);
            const url = `http://localhost:${port}`;
            
            // Try to open in Simple Browser
            try {
                await vscode.commands.executeCommand('simpleBrowser.show', url);
                vscode.window.showInformationMessage(constants.MSG_NPM_SERVER_READY.replace('{0}', tutorialName));
            } catch (error) {
                Logger.error('Failed to open Simple Browser', error);
                // Fallback to external browser
                await vscode.env.openExternal(vscode.Uri.parse(url));
            }
        } else {
            Logger.warn(`Server did not start within timeout on port ${port}`);
            vscode.window.showWarningMessage(
                constants.MSG_NPM_SERVER_TIMEOUT.replace('{0}', tutorialName)
            );
        }
    }
}
