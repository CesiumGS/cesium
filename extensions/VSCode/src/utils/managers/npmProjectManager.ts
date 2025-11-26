import * as vscode from 'vscode';
import { FileSystemHelper } from '../fileSystem';
import { PortDetector } from '../portDetector';
import { Logger } from '../logger';

/**
 * Manages npm project operations like dev server, installations, etc.
 */
export class NpmProjectManager {
    /**
     * Check if node_modules exists in a directory
     */
    async hasNodeModules(tutorialDir: string): Promise<boolean> {
        const nodeModulesPath = FileSystemHelper.join(tutorialDir, 'node_modules');
        const nodeModulesUri = vscode.Uri.file(nodeModulesPath);
        return await FileSystemHelper.exists(nodeModulesUri);
    }

    /**
     * Install npm dependencies in a tutorial directory
     */
    async installDependencies(tutorialDir: string, tutorialName: string): Promise<vscode.Terminal> {
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
    async startDevServer(tutorialDir: string, tutorialName: string): Promise<void> {
        // Check if dependencies are installed
        const hasModules = await this.hasNodeModules(tutorialDir);
        
        if (!hasModules) {
            const install = await vscode.window.showInformationMessage(
                `Dependencies not installed for "${tutorialName}". Install now?`,
                'Yes, Install',
                'Cancel'
            );
            
            if (install !== 'Yes, Install') {
                return;
            }
            
            // Run npm install and show message
            await this.installDependencies(tutorialDir, tutorialName);
            
            vscode.window.showInformationMessage(
                `Installing dependencies... Run "npm run dev" when complete, or click Play again.`
            );
            return;
        }
        
        // Find available port
        const port = await PortDetector.findDefaultAvailablePort();
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
    async isNpmProject(tutorialDir: string): Promise<boolean> {
        const packageJsonPath = vscode.Uri.file(FileSystemHelper.join(tutorialDir, 'package.json'));
        return await FileSystemHelper.exists(packageJsonPath);
    }

    /**
     * Wait for server to start and open browser
     */
    private async waitAndOpenBrowser(port: number, tutorialName: string): Promise<void> {
        vscode.window.showInformationMessage(
            `Starting dev server on port ${port}...`
        );
        
        // Wait up to 60 seconds for server to start (increased for Vite + dependency bundling)
        const serverStarted = await PortDetector.waitForPort(port, 60000, 1000);
        
        if (serverStarted) {
            Logger.info(`Server started on port ${port}`);
            const url = `http://localhost:${port}`;
            
            // Try to open in Simple Browser
            try {
                await vscode.commands.executeCommand('simpleBrowser.show', url);
                vscode.window.showInformationMessage(`Dev server ready: ${tutorialName}`);
            } catch (error) {
                Logger.error('Failed to open Simple Browser', error);
                // Fallback to external browser
                await vscode.env.openExternal(vscode.Uri.parse(url));
            }
        } else {
            Logger.warn(`Server did not start within timeout on port ${port}`);
            vscode.window.showWarningMessage(
                `Dev server for "${tutorialName}" is taking longer than expected. Check the terminal for details.`
            );
        }
    }
}
