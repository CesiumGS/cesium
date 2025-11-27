import * as vscode from 'vscode';
import { FileSystemHelper } from '../fileSystem';
import { TemplateLoader } from '../templateLoader';
import { Logger } from '../logger';
import { Tutorial } from '../../models/tutorial';
import * as constants from '../constants';

/**
 * Handles creation and management of tutorial project files
 */
export class TutorialFileManager {
    constructor(private readonly extensionUri: vscode.Uri) {}

    /**
     * Copy all files from a tutorial folder to a destination
     */
    async copyTutorialFolder(source: vscode.Uri, destination: vscode.Uri): Promise<void> {
        const entries = await FileSystemHelper.readDirectory(source);

        for (const [name, type] of entries) {
            if (type === vscode.FileType.File) {
                const srcPath = vscode.Uri.joinPath(source, name);
                const destPath = vscode.Uri.joinPath(destination, name);
                await FileSystemHelper.copyFile(srcPath, destPath);
            }
        }
    }

    /**
     * Create npm project files for a tutorial
     */
    async createNpmProjectFiles(tutorial: Tutorial, tutorialPath: vscode.Uri, tutorialSlug: string, token: string | undefined, convertedCode: string): Promise<void> {
        // Create package.json
        const packageJsonContent = await TemplateLoader.loadAndReplace(
            this.extensionUri,
            'package.json.template',
            {
                'TUTORIAL_SLUG': tutorialSlug,
                'TUTORIAL_DESCRIPTION': tutorial.description || tutorial.name
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

        // Create index.html
        const htmlContent = await TemplateLoader.loadAndReplace(
            this.extensionUri,
            'index.html.template',
            {
                'TUTORIAL_NAME': tutorial.name
            }
        );
        await FileSystemHelper.writeFile(
            vscode.Uri.joinPath(tutorialPath, constants.FILE_INDEX_HTML),
            htmlContent
        );

        // Create main.js with ES6 imports (token loaded from .env)
        const mainJsContent = await TemplateLoader.loadAndReplace(
            this.extensionUri,
            'main.js.template',
            {
                'TUTORIAL_CODE': convertedCode
            }
        );
        await FileSystemHelper.writeFile(
            vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS),
            mainJsContent
        );

        // Create .env file with token (if provided)
        if (token) {
            const envContent = `# Cesium Ion Access Token\n# Get your token at: https://ion.cesium.com/tokens\nVITE_CESIUM_TOKEN=${token}\n`;
            await FileSystemHelper.writeFile(
                vscode.Uri.joinPath(tutorialPath, '.env'),
                envContent
            );
        }

        // Create .gitignore
        const gitignoreContent = 'node_modules/\ndist/\n.env\n';
        await FileSystemHelper.writeFile(
            vscode.Uri.joinPath(tutorialPath, '.gitignore'),
            gitignoreContent
        );
    }

    /**
     * Create legacy CDN-based files for a tutorial
     */
    async createLegacyCdnFiles(tutorial: Tutorial, tutorialPath: vscode.Uri, jsCode: string): Promise<void> {
        // Create index.html with embedded Cesium CDN
        const htmlContent = tutorial.code.html || '';
        await FileSystemHelper.writeFile(
            vscode.Uri.joinPath(tutorialPath, constants.FILE_INDEX_HTML),
            htmlContent
        );

        // Create main.js
        await FileSystemHelper.writeFile(
            vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS),
            jsCode
        );

        // Create styles.css if exists
        if (tutorial.code.css) {
            await FileSystemHelper.writeFile(
                vscode.Uri.joinPath(tutorialPath, constants.FILE_STYLES_CSS),
                tutorial.code.css
            );
        }
    }

    /**
     * Create a README file for the tutorial
     */
    async createTutorialReadme(tutorial: Tutorial, tutorialPath: vscode.Uri, isNpmProject: boolean = true): Promise<void> {
        try {
            const templateName = isNpmProject ? 'tutorialProjectReadme.md' : 'tutorialReadme.md';
            const tutorialSlug = tutorial.slug || this.createSlugFromName(tutorial.name);
            const cssFileLine = tutorial.code?.css ? '\n- **' + constants.FILE_STYLES_CSS + '**' : '';
            const cssFileTreeLine = tutorial.code?.css ? '\n    ├── ' + constants.FILE_STYLES_CSS : '';
            
            const readmeContent = await TemplateLoader.loadAndReplace(
                this.extensionUri,
                templateName,
                {
                    'TUTORIAL_NAME': tutorial.name,
                    'TUTORIAL_DESCRIPTION': tutorial.description || '',
                    'TUTORIAL_SLUG': tutorialSlug,
                    'FOLDER_CESIUM_TUTORIALS': constants.FOLDER_CESIUM_TUTORIALS,
                    'FILE_INDEX_HTML': constants.FILE_INDEX_HTML,
                    'FILE_MAIN_JS': constants.FILE_MAIN_JS,
                    'FILE_METADATA_JSON': constants.FILE_METADATA_JSON,
                    'FILE_STYLES_CSS': constants.FILE_STYLES_CSS,
                    'FILE_README_MD': constants.FILE_README_MD,
                    'CSS_FILE_LINE': cssFileLine,
                    'CSS_FILE_TREE_LINE': cssFileTreeLine
                }
            );

            const readmePath = vscode.Uri.joinPath(tutorialPath, 'README.md');
            await FileSystemHelper.writeFile(readmePath, readmeContent);
        } catch (error) {
            Logger.error('Failed to create tutorial README from template', error);
        }
    }

    /**
     * Open tutorial files in the VS Code editor
     */
    async openTutorialFilesInEditor(tutorialPath: vscode.Uri): Promise<void> {
        const readmeUri = vscode.Uri.joinPath(tutorialPath, 'README.md');
        const jsUri = vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS);

        const readmeDoc = await vscode.workspace.openTextDocument(readmeUri);
        await vscode.window.showTextDocument(readmeDoc, { preview: false });

        const jsDoc = await vscode.workspace.openTextDocument(jsUri);
        await vscode.window.showTextDocument(jsDoc, { viewColumn: vscode.ViewColumn.Beside });
    }

    /**
     * Create a slug from a tutorial name
     */
    createSlugFromName(name: string): string {
        return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
}
