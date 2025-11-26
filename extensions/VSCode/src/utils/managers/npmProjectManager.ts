import * as vscode from 'vscode';
import { FileSystemHelper } from '../fileSystem';

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
    async startDevServer(tutorialDir: string, tutorialName: string, port: number = 5173): Promise<void> {
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
        
        // Start dev server
        const terminal = vscode.window.createTerminal({
            name: `Vite Dev - ${tutorialName}`,
            cwd: tutorialDir
        });
        terminal.show();
        terminal.sendText('npm run dev');
        
        // Wait a bit for server to start, then open in Simple Browser
        setTimeout(() => {
            vscode.commands.executeCommand('simpleBrowser.show', `http://localhost:${port}`);
        }, 2000);
        
        vscode.window.showInformationMessage(
            `Dev server starting for "${tutorialName}". Opening in Simple Browser...`
        );
    }

    /**
     * Check if a directory is an npm project
     */
    async isNpmProject(tutorialDir: string): Promise<boolean> {
        const packageJsonPath = vscode.Uri.file(FileSystemHelper.join(tutorialDir, 'package.json'));
        return await FileSystemHelper.exists(packageJsonPath);
    }
}
