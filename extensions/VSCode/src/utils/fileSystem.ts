import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './logger';

/**
 * File system utilities using VS Code's workspace.fs API
 */
export class FileSystemHelper {
    /**
     * Read a file as UTF-8 text
     */
    static async readFile(uri: vscode.Uri): Promise<string> {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            return Buffer.from(content).toString('utf8');
        } catch (error) {
            Logger.error(`Failed to read file: ${uri.fsPath}`, error);
            throw error;
        }
    }

    /**
     * Write text content to a file
     */
    static async writeFile(uri: vscode.Uri, content: string): Promise<void> {
        try {
            const buffer = Buffer.from(content, 'utf8');
            await vscode.workspace.fs.writeFile(uri, buffer);
        } catch (error) {
            Logger.error(`Failed to write file: ${uri.fsPath}`, error);
            throw error;
        }
    }

    /**
     * Create a directory recursively
     */
    static async createDirectory(uri: vscode.Uri): Promise<void> {
        try {
            await vscode.workspace.fs.createDirectory(uri);
        } catch (error) {
            Logger.error(`Failed to create directory: ${uri.fsPath}`, error);
            throw error;
        }
    }

    /**
     * Check if a file or directory exists
     */
    static async exists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Read a directory and return entries
     */
    static async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        try {
            return await vscode.workspace.fs.readDirectory(uri);
        } catch (error) {
            Logger.error(`Failed to read directory: ${uri.fsPath}`, error);
            throw error;
        }
    }

    /**
     * Copy a file from source to destination
     */
    static async copyFile(source: vscode.Uri, destination: vscode.Uri): Promise<void> {
        try {
            await vscode.workspace.fs.copy(source, destination, { overwrite: true });
        } catch (error) {
            Logger.error(`Failed to copy file from ${source.fsPath} to ${destination.fsPath}`, error);
            throw error;
        }
    }

    /**
     * Get the basename of a path
     */
    static basename(filePath: string, ext?: string): string {
        return path.basename(filePath, ext);
    }

    /**
     * Get the dirname of a path
     */
    static dirname(filePath: string): string {
        return path.dirname(filePath);
    }

    /**
     * Join path segments
     */
    static join(...paths: string[]): string {
        return path.join(...paths);
    }
}
