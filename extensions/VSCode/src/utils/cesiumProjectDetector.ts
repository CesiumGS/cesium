import * as vscode from 'vscode';
import { FileSystemHelper } from './fileSystem';

/**
 * Patterns for detecting Cesium-specific files
 */
export interface CesiumProjectFiles {
    jsFile?: vscode.Uri;
    htmlFile?: vscode.Uri;
    cssFile?: vscode.Uri;
}

/**
 * Detects Cesium projects in a directory and identifies relevant files
 */
export class CesiumProjectDetector {
    // Indicators that a file contains Cesium code
    private static readonly CESIUM_INDICATORS = [
        'Cesium.Viewer',
        'new Viewer',
        'from "cesium"',
        "from 'cesium'",
        'import * as Cesium',
        'import Cesium',
        '@cesium/engine',
        'cesium.com/downloads/cesiumjs',
        'Cesium.Ion',
        'Ion.defaultAccessToken',
        'CesiumTerrainProvider',
        'Cesium3DTileset',
        'ImageryLayer',
        'Scene',
        'Camera',
        'Entity',
        'Cartesian3',
        'createWorldTerrain',
        'IonResource'
    ];

    // Files and directories to exclude from scanning
    private static readonly EXCLUDE_PATTERNS = [
        'node_modules',
        'dist',
        'build',
        'out',
        '.git',
        '.vscode',
        '.next',
        '.nuxt',
        'coverage',
        'package-lock.json',
        'yarn.lock',
        'package.json', // Will handle separately
        '.config.',
        '.min.',
        '.map',
        'vite.config',
        'webpack.config',
        'rollup.config',
        'tsconfig',
        'eslint',
        'prettier'
    ];

    /**
     * Detect if a directory contains a Cesium project
     */
    public static async isCesiumProject(directoryPath: string): Promise<boolean> {
        try {
            const dirUri = vscode.Uri.file(directoryPath);
            const entries = await FileSystemHelper.readDirectory(dirUri);

            // Check for package.json with cesium dependencies
            const packageJsonUri = vscode.Uri.file(FileSystemHelper.join(directoryPath, 'package.json'));
            if (await FileSystemHelper.exists(packageJsonUri)) {
                const packageContent = await FileSystemHelper.readFile(packageJsonUri);
                if (packageContent.includes('cesium') || packageContent.includes('@cesium/engine')) {
                    return true;
                }
            }

            // Check for typical Cesium files
            for (const [fileName] of entries) {
                const filePath = FileSystemHelper.join(directoryPath, fileName);
                
                // Check JS files
                if (fileName.endsWith('.js')) {
                    if (await this.containsCesiumCode(filePath)) {
                        return true;
                    }
                }

                // Check HTML files
                if (fileName.endsWith('.html')) {
                    if (await this.containsCesiumCode(filePath)) {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if a file contains Cesium-related code
     */
    private static async containsCesiumCode(filePath: string): Promise<boolean> {
        try {
            const fileUri = vscode.Uri.file(filePath);
            
            // Check if it's actually a file (not a directory)
            if (!await FileSystemHelper.isFile(fileUri)) {
                return false;
            }
            
            const content = await FileSystemHelper.readFile(fileUri);
            return this.CESIUM_INDICATORS.some(indicator => content.includes(indicator));
        } catch (error) {
            return false;
        }
    }

    /**
     * Find Cesium-related files in a directory by scanning all files
     */
    static async findCesiumFiles(directoryPath: string): Promise<CesiumProjectFiles> {
        const result: CesiumProjectFiles = {};

        try {
            const dirUri = vscode.Uri.file(directoryPath);
            const entries = await FileSystemHelper.readDirectory(dirUri);

            let jsFiles: Array<{ name: string; path: string; hasCesium: boolean }> = [];
            let htmlFiles: string[] = [];
            let cssFiles: string[] = [];

            // Scan all files in directory
            for (const [fileName] of entries) {
                // Skip excluded patterns
                if (this.shouldExcludeFile(fileName)) {
                    continue;
                }

                const filePath = FileSystemHelper.join(directoryPath, fileName);

                // Collect JavaScript files
                if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.jsx')) {
                    const hasCesium = await this.containsCesiumCode(filePath);
                    jsFiles.push({ name: fileName, path: filePath, hasCesium });
                }
                // Collect HTML files
                else if (fileName.endsWith('.html')) {
                    htmlFiles.push(filePath);
                }
                // Collect CSS files
                else if (fileName.endsWith('.css')) {
                    cssFiles.push(filePath);
                }
            }

            // Find best JavaScript file (prioritize files with Cesium code)
            const cesiumJsFile = jsFiles.find(f => f.hasCesium);
            if (cesiumJsFile) {
                result.jsFile = vscode.Uri.file(cesiumJsFile.path);
            } else if (jsFiles.length > 0) {
                // Fallback to first JS file if none contain obvious Cesium code
                result.jsFile = vscode.Uri.file(jsFiles[0].path);
            }

            // Find best HTML file (prefer ones that reference Cesium or the JS file)
            if (htmlFiles.length > 0) {
                let bestHtml = htmlFiles[0];
                
                // Look for HTML with Cesium references
                for (const htmlPath of htmlFiles) {
                    if (await this.containsCesiumCode(htmlPath)) {
                        bestHtml = htmlPath;
                        break;
                    }
                }
                
                result.htmlFile = vscode.Uri.file(bestHtml);
            }

            // Find CSS file (just use first one found)
            if (cssFiles.length > 0) {
                result.cssFile = vscode.Uri.file(cssFiles[0]);
            }

            return result;
        } catch (error) {
            return result;
        }
    }

    /**
     * Check if a file should be excluded from scanning
     */
    private static shouldExcludeFile(fileName: string): boolean {
        return this.EXCLUDE_PATTERNS.some(pattern => fileName.includes(pattern));
    }

    /**
     * Check if a specific file is part of a Cesium project
     */
    static async isPartOfCesiumProject(filePath: string): Promise<boolean> {
        const fileName = FileSystemHelper.basename(filePath);
        const directory = FileSystemHelper.dirname(filePath);

        // Skip excluded files and directories
        if (this.shouldExcludeFile(fileName) || this.shouldExcludeFile(directory)) {
            return false;
        }

        // Verify it's actually a file, not a directory
        const fileUri = vscode.Uri.file(filePath);
        if (!await FileSystemHelper.isFile(fileUri)) {
            return false;
        }

        // Check if file contains Cesium code directly
        if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.jsx') || fileName.endsWith('.html')) {
            const hasCesiumCode = await this.containsCesiumCode(filePath);
            if (hasCesiumCode) {
                return true;
            }
        }

        // Check if the directory is a Cesium project
        if (fileName.endsWith('.js') || fileName.endsWith('.html') || fileName.endsWith('.css')) {
            return await this.isCesiumProject(directory);
        }

        return false;
    }

    /**
     * Get all file patterns for file watchers (watch all web files)
     */
    static getAllFilePatterns(): string {
        return '**/*.{js,mjs,jsx,html,css}';
    }
}
