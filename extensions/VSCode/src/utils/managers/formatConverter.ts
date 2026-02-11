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
    public async convertCdnToNpm(tutorialPath: vscode.Uri, tutorialSlug: string, token: string | undefined): Promise<void> {
        // Read existing main.js
        const mainJsPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS);
        const jsCode = await FileSystemHelper.readFile(mainJsPath);
        
        // Convert to ES6 imports
        const convertedCode = this.removeTokenAssignments(jsCode);
        
        // Create package.json
        await this.createFileFromTemplate(
            tutorialPath,
            'package.json',
            'package.json.template',
            {
                'TUTORIAL_SLUG': tutorialSlug,
                'TUTORIAL_DESCRIPTION': tutorialSlug
            }
        );

        // Create vite.config.js
        await this.createFileFromTemplate(
            tutorialPath,
            'vite.config.js',
            'vite.config.js.template'
        );

        // Update index.html to use module script
        await this.updateHtmlForNpm(tutorialPath);

        // Update main.js with converted code
        await this.createFileFromTemplate(
            tutorialPath,
            constants.FILE_MAIN_JS,
            'main.js.template',
            {
                'CESIUM_TOKEN': token || 'YOUR_CESIUM_ION_ACCESS_TOKEN',
                'TUTORIAL_CODE': convertedCode
            }
        );

        // Create .env file with token
        const envContent = `# Cesium Ion Access Token\n# Get your token at: https://ion.cesium.com/tokens\nVITE_CESIUM_TOKEN=${token || 'YOUR_CESIUM_ION_ACCESS_TOKEN'}\n`;
        await this.writeFile(tutorialPath, '.env', envContent);

        // Create .gitignore
        await this.writeFile(tutorialPath, '.gitignore', 'node_modules/\ndist/\n.env\n');
    }

    /**
     * Convert an npm-based tutorial to CDN format
     */
    public async convertNpmToCdn(tutorialPath: vscode.Uri): Promise<void> {
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
     * Remove token assignmentsd
     */
    public removeTokenAssignments(code: string): string {
        // Remove Cesium.Ion.defaultAccessToken line (we handle it in template)
        let converted = code.replace(patterns.TOKEN_ASSIGNMENT_REGEX, '');
        
        // Remove global Cesium references in comments
        converted = converted.replace(patterns.TOKEN_COMMENT_REGEX, '');
        
        // Keep Cesium namespace - template already imports * as Cesium
        // No need to modify the code, it will work with global Cesium namespace
        
        return converted;
    }

    /**
     * Apply multiple string replacements to code
     */
    private applyReplacements(code: string, replacements: Array<[string | RegExp, string]>): string {
        return replacements.reduce((result, [pattern, replacement]) => 
            result.replace(pattern, replacement), code
        );
    }

    /**
     * Convert ES6 imports back to global Cesium references
     */
    private convertToCdnFormat(jsCode: string): string {
        return this.applyReplacements(jsCode, [
            // Remove ES6 import statements
            [patterns.CESIUM_ENGINE_IMPORT_NAMED_REGEX, ''],
            [patterns.CESIUM_ENGINE_IMPORT_NAMESPACE_REGEX, ''],
            // Convert token assignment back to global Cesium
            [new RegExp(patterns.ION_TOKEN_ASSIGNMENT, 'g'), patterns.CESIUM_ION_TOKEN_ASSIGNMENT],
            // Convert class references back to Cesium namespace
            [/new Viewer\(/g, patterns.CESIUM_VIEWER_PATTERN],
            [/\bCesiumMath\./g, patterns.CESIUM_MATH_PATTERN],
            [/\bCartesian3\./g, patterns.CESIUM_CARTESIAN3_PATTERN],
            [/\bColor\./g, patterns.CESIUM_COLOR_PATTERN],
            [/\bRectangle\./g, patterns.CESIUM_RECTANGLE_PATTERN],
            [/\bEntity\(/g, patterns.CESIUM_ENTITY_PATTERN]
        ]);
    }

    /**
     * Create a file from template with optional replacements
     */
    private async createFileFromTemplate(
        basePath: vscode.Uri,
        fileName: string,
        templateName: string,
        replacements?: Record<string, string>
    ): Promise<void> {
        const content = replacements
            ? await TemplateLoader.loadAndReplace(this.extensionUri, templateName, replacements)
            : await TemplateLoader.loadTemplate(this.extensionUri, templateName);
        await FileSystemHelper.writeFile(vscode.Uri.joinPath(basePath, fileName), content);
    }

    /**
     * Write content to a file
     */
    private async writeFile(basePath: vscode.Uri, fileName: string, content: string): Promise<void> {
        await FileSystemHelper.writeFile(vscode.Uri.joinPath(basePath, fileName), content);
    }

    /**
     * Read, transform, and write HTML file
     */
    private async transformHtmlFile(
        tutorialPath: vscode.Uri,
        transformer: (content: string) => string
    ): Promise<void> {
        const htmlPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_INDEX_HTML);
        if (await FileSystemHelper.exists(htmlPath)) {
            const htmlContent = await FileSystemHelper.readFile(htmlPath);
            const transformed = transformer(htmlContent);
            await FileSystemHelper.writeFile(htmlPath, transformed);
        }
    }

    /**
     * Update HTML file to use ES6 modules and remove CDN links
     */
    private async updateHtmlForNpm(tutorialPath: vscode.Uri): Promise<void> {
        await this.transformHtmlFile(tutorialPath, (htmlContent) => {
            // Remove CDN script tags
            let content = htmlContent.replace(patterns.CESIUM_CDN_SCRIPT_REGEX, '');
            content = content.replace(patterns.CESIUM_CDN_LINK_REGEX, '');
            
            // Ensure script tag has type="module"
            if (!content.includes('type="module"')) {
                content = content.replace(patterns.MAIN_JS_SCRIPT_REGEX, '<script type="module" src="main.js">');
            } else {
                // Ensure path is correct (no ./)
                content = content.replace(patterns.MAIN_JS_SRC_REGEX, 'src="main.js"');
            }
            
            return content;
        });
    }

    /**
     * Update HTML file to use CDN links and remove module type
     */
    private async updateHtmlForCdn(tutorialPath: vscode.Uri): Promise<void> {
        await this.transformHtmlFile(tutorialPath, (htmlContent) => {
            // Remove module type
            let content = htmlContent.replace(/type=["']module["']\s*/gi, '');
            
            // Add CDN links if not present
            if (!content.includes('cesium.com/downloads')) {
                const head = content.indexOf('</head>');
                if (head !== -1) {
                    const cdnLinks = `    <script src="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Cesium.js"></script>\n    <link href="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Widgets/widgets.css" rel="stylesheet">\n`;
                    content = content.slice(0, head) + cdnLinks + content.slice(head);
                }
            }
            
            return content;
        });
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
