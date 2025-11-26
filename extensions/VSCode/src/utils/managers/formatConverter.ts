import * as vscode from 'vscode';
import { FileSystemHelper } from '../fileSystem';
import { TemplateLoader } from '../templateLoader';
import { Logger } from '../logger';
import * as patterns from '../codePatterns';
import * as constants from '../constants';

/**
 * Handles conversion between different Cesium project formats (npm vs CDN)
 */
export class FormatConverter {
    constructor(private readonly extensionUri: vscode.Uri) {}

    /**
     * Convert a CDN-based tutorial to npm format
     */
    async convertCdnToNpm(tutorialPath: vscode.Uri, tutorialSlug: string, token: string | undefined): Promise<void> {
        // Read existing main.js
        const mainJsPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS);
        const jsCode = await FileSystemHelper.readFile(mainJsPath);
        
        // Convert to ES6 imports
        const convertedCode = this.convertToES6Imports(jsCode);
        
        // Create package.json
        const packageJsonContent = await TemplateLoader.loadAndReplace(
            this.extensionUri,
            'package.json.template',
            {
                'TUTORIAL_SLUG': tutorialSlug,
                'TUTORIAL_DESCRIPTION': tutorialSlug
            }
        );
        await FileSystemHelper.writeFile(
            vscode.Uri.joinPath(tutorialPath, 'package.json'),
            packageJsonContent
        );

        // Create vite.config.js
        const viteConfigContent = await TemplateLoader.loadTemplate(
            this.extensionUri,
            'vite.config.js.template'
        );
        await FileSystemHelper.writeFile(
            vscode.Uri.joinPath(tutorialPath, 'vite.config.js'),
            viteConfigContent
        );

        // Update index.html to use module script
        await this.updateHtmlForNpm(tutorialPath);

        // Update main.js with converted code
        const mainJsContent = await TemplateLoader.loadAndReplace(
            this.extensionUri,
            'main.js.template',
            {
                'CESIUM_TOKEN': token || 'YOUR_CESIUM_ION_ACCESS_TOKEN',
                'TUTORIAL_CODE': convertedCode
            }
        );
        await FileSystemHelper.writeFile(mainJsPath, mainJsContent);

        // Create .gitignore
        const gitignoreContent = 'node_modules/\ndist/\n.env\n';
        await FileSystemHelper.writeFile(
            vscode.Uri.joinPath(tutorialPath, '.gitignore'),
            gitignoreContent
        );
    }

    /**
     * Convert an npm-based tutorial to CDN format
     */
    async convertNpmToCdn(tutorialPath: vscode.Uri): Promise<void> {
        // Read existing main.js
        const mainJsPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS);
        let jsCode = await FileSystemHelper.readFile(mainJsPath);
        
        // Convert ES6 imports back to global Cesium
        jsCode = this.convertToCdnFormat(jsCode);
        
        // Update main.js
        await FileSystemHelper.writeFile(mainJsPath, jsCode);
        
        // Update index.html to use CDN
        await this.updateHtmlForCdn(tutorialPath);
        
        // Remove npm-specific files
        await this.removeNpmFiles(tutorialPath);
    }

    /**
     * Convert tutorial code to use ES6 imports (remove Cesium global references)
     */
    convertToES6Imports(code: string): string {
        // Remove Cesium.Ion.defaultAccessToken line (we handle it in template)
        let converted = code.replace(patterns.TOKEN_ASSIGNMENT_REGEX, '');
        
        // Remove global Cesium references in comments
        converted = converted.replace(patterns.TOKEN_COMMENT_REGEX, '');
        
        // Keep Cesium namespace - template already imports * as Cesium
        // No need to modify the code, it will work with global Cesium namespace
        
        return converted;
    }

    /**
     * Convert ES6 imports back to global Cesium references
     */
    private convertToCdnFormat(jsCode: string): string {
        let converted = jsCode;
        
        // Remove ES6 import statements
        converted = converted.replace(patterns.CESIUM_ENGINE_IMPORT_NAMED_REGEX, '');
        converted = converted.replace(patterns.CESIUM_ENGINE_IMPORT_NAMESPACE_REGEX, '');
        
        // Convert token assignment back to global Cesium
        converted = converted.replace(new RegExp(patterns.ION_TOKEN_ASSIGNMENT, 'g'), patterns.CESIUM_ION_TOKEN_ASSIGNMENT);
        
        // Convert class references back to Cesium namespace
        converted = converted.replace(/new Viewer\(/g, patterns.CESIUM_VIEWER_PATTERN);
        converted = converted.replace(/\bCesiumMath\./g, patterns.CESIUM_MATH_PATTERN);
        converted = converted.replace(/\bCartesian3\./g, patterns.CESIUM_CARTESIAN3_PATTERN);
        converted = converted.replace(/\bColor\./g, patterns.CESIUM_COLOR_PATTERN);
        converted = converted.replace(/\bRectangle\./g, patterns.CESIUM_RECTANGLE_PATTERN);
        converted = converted.replace(/\bEntity\(/g, patterns.CESIUM_ENTITY_PATTERN);
        
        return converted;
    }

    /**
     * Update HTML file to use ES6 modules and remove CDN links
     */
    private async updateHtmlForNpm(tutorialPath: vscode.Uri): Promise<void> {
        const htmlPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_INDEX_HTML);
        if (await FileSystemHelper.exists(htmlPath)) {
            let htmlContent = await FileSystemHelper.readFile(htmlPath);
            
            // Remove CDN script tags
            htmlContent = htmlContent.replace(patterns.CESIUM_CDN_SCRIPT_REGEX, '');
            htmlContent = htmlContent.replace(patterns.CESIUM_CDN_LINK_REGEX, '');
            
            // Ensure script tag has type="module"
            if (!htmlContent.includes('type="module"')) {
                htmlContent = htmlContent.replace(patterns.MAIN_JS_SCRIPT_REGEX, '<script type="module" src="main.js">');
            } else {
                // Ensure path is correct (no ./)
                htmlContent = htmlContent.replace(patterns.MAIN_JS_SRC_REGEX, 'src="main.js"');
            }
            
            await FileSystemHelper.writeFile(htmlPath, htmlContent);
        }
    }

    /**
     * Update HTML file to use CDN links and remove module type
     */
    private async updateHtmlForCdn(tutorialPath: vscode.Uri): Promise<void> {
        const htmlPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_INDEX_HTML);
        if (await FileSystemHelper.exists(htmlPath)) {
            let htmlContent = await FileSystemHelper.readFile(htmlPath);
            
            // Remove module type
            htmlContent = htmlContent.replace(/type=["']module["']\s*/gi, '');
            
            // Add CDN links if not present
            if (!htmlContent.includes('cesium.com/downloads')) {
                const head = htmlContent.indexOf('</head>');
                if (head !== -1) {
                    const cdnLinks = `    <script src="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Cesium.js"></script>\n    <link href="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Widgets/widgets.css" rel="stylesheet">\n`;
                    htmlContent = htmlContent.slice(0, head) + cdnLinks + htmlContent.slice(head);
                }
            }
            
            await FileSystemHelper.writeFile(htmlPath, htmlContent);
        }
    }

    /**
     * Remove npm-specific files from tutorial directory
     */
    private async removeNpmFiles(tutorialPath: vscode.Uri): Promise<void> {
        const filesToRemove = ['package.json', 'vite.config.js', '.gitignore', 'package-lock.json', 'node_modules'];
        for (const file of filesToRemove) {
            const filePath = vscode.Uri.joinPath(tutorialPath, file);
            try {
                if (await FileSystemHelper.exists(filePath)) {
                    await vscode.workspace.fs.delete(filePath, { recursive: true, useTrash: false });
                }
            } catch (error) {
                Logger.warn(`Failed to remove ${file}`, error);
            }
        }
    }
}
