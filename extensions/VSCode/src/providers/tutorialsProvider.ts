import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { FileSystemHelper } from '../utils/fileSystem';
import * as constants from '../utils/constants';
import { TutorialItem } from './tutorialItem';
import { Tutorial, TutorialMetadata } from '../models/tutorial';


export class TutorialsProvider implements vscode.TreeDataProvider<TutorialItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TutorialItem | undefined | null | void> = new vscode.EventEmitter<TutorialItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TutorialItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private tutorials: Tutorial[] = [];
    private tutorialsPath: string;
    private searchQuery: string = '';

    constructor(extensionPath: string) {
        // Tutorials are copied to the out directory during build
        this.tutorialsPath = path.join(extensionPath, constants.FOLDER_TUTORIALS);
        this.loadTutorials();
    }

    refresh(): void {
        this.loadTutorials();
    }

    setSearchQuery(query: string): void {
        this.searchQuery = query.toLowerCase().trim();
        this._onDidChangeTreeData.fire();
    }

    clearSearch(): void {
        this.searchQuery = '';
        this._onDidChangeTreeData.fire();
    }

    private getFilteredTutorials(): Tutorial[] {
        if (!this.searchQuery) {
            return this.tutorials;
        }

        return this.tutorials.filter(tutorial => 
            tutorial.name.toLowerCase().includes(this.searchQuery) ||
            tutorial.description.toLowerCase().includes(this.searchQuery) ||
            tutorial.category.toLowerCase().includes(this.searchQuery)
        );
    }

    getTreeItem(element: TutorialItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TutorialItem): Thenable<TutorialItem[]> {
        const filteredTutorials = this.getFilteredTutorials();

        if (!element) {
            // If searching, show all matching tutorials in flat list
            if (this.searchQuery) {
                return Promise.resolve(
                    filteredTutorials.map(t => new TutorialItem(
                        `${t.name} (${t.category})`,
                        vscode.TreeItemCollapsibleState.None,
                        constants.CONTEXT_VALUE_TUTORIAL,
                        t
                    ))
                );
            }

            // Return categories
            const categories = this.getCategories();
            return Promise.resolve(
                categories.map(cat => new TutorialItem(
                    cat,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    constants.CONTEXT_VALUE_CATEGORY
                ))
            );
        } else if (element.contextValue === constants.CONTEXT_VALUE_CATEGORY) {
            // Return tutorials for this category
            const tutorials = filteredTutorials.filter(t => t.category === element.label);
            return Promise.resolve(
                tutorials.map(t => new TutorialItem(
                    t.name,
                    vscode.TreeItemCollapsibleState.None,
                    constants.CONTEXT_VALUE_TUTORIAL,
                    t
                ))
            );
        }
        return Promise.resolve([]);
    }

    private getCategories(): string[] {
        const filteredTutorials = this.getFilteredTutorials();
        const categories = new Set(filteredTutorials.map(t => t.category));
        return Array.from(categories).sort();
    }

    private async loadTutorials(): Promise<void> {
        this.tutorials = [];
        const tutorialsDir = vscode.Uri.file(this.tutorialsPath);

        if (!(await FileSystemHelper.exists(tutorialsDir))) {
            Logger.warn(`${constants.MSG_TUTORIALS_DIR_NOT_FOUND}: ${this.tutorialsPath}`);
            vscode.window.showErrorMessage(`${constants.MSG_TUTORIALS_DIR_NOT_FOUND}: ${this.tutorialsPath}`);
            return;
        }

        try {
            const entries = await FileSystemHelper.readDirectory(tutorialsDir);
            
            const folders = entries
                .filter(([_, type]) => type === vscode.FileType.Directory)
                .map(([name, _]) => name);

            Logger.info(`Found ${folders.length} tutorial folders: ${folders.join(', ')}`);

            // Load all tutorials in parallel for better performance
            const loadPromises = folders.map(folder => this.loadTutorial(tutorialsDir, folder));
            await Promise.all(loadPromises);

            Logger.info(`Successfully loaded ${this.tutorials.length} tutorials`);
            
            if (this.tutorials.length === 0) {
                Logger.warn('No tutorials were loaded successfully');
            }
            
            // Notify the tree view that data has changed
            this._onDidChangeTreeData.fire();
        } catch (error) {
            Logger.error('Failed to load tutorials', error);
            vscode.window.showErrorMessage(`Failed to load tutorials: ${error}`);
        }
    }

    private async loadTutorial(tutorialsDir: vscode.Uri, folder: string): Promise<void> {
        const tutorialPath = vscode.Uri.joinPath(tutorialsDir, folder);
        const metadataPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_METADATA_JSON);
        const htmlPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_INDEX_HTML);
        const jsPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_MAIN_JS);
        const cssPath = vscode.Uri.joinPath(tutorialPath, constants.FILE_STYLES_CSS);

        try {
            const hasRequiredFiles = await Promise.all([
                FileSystemHelper.exists(metadataPath),
                FileSystemHelper.exists(htmlPath),
                FileSystemHelper.exists(jsPath)
            ]);

            Logger.debug(`Tutorial ${folder} - metadata: ${hasRequiredFiles[0]}, html: ${hasRequiredFiles[1]}, js: ${hasRequiredFiles[2]}`);

            if (!hasRequiredFiles.every(exists => exists)) {
                Logger.warn(`Skipping incomplete tutorial: ${folder} - missing required files`);
                return;
            }

            const [metadataJson, html, javascript] = await Promise.all([
                FileSystemHelper.readFile(metadataPath),
                FileSystemHelper.readFile(htmlPath),
                FileSystemHelper.readFile(jsPath)
            ]);

            const metadata: TutorialMetadata = JSON.parse(metadataJson);
            const css = await FileSystemHelper.exists(cssPath)
                ? await FileSystemHelper.readFile(cssPath)
                : undefined;

            this.tutorials.push({
                name: metadata.name,
                slug: metadata.slug || folder,
                category: metadata.category || 'Uncategorized',
                description: metadata.description || '',
                code: {
                    html,
                    javascript,
                    css
                }
            });
            
            Logger.info(`Successfully loaded tutorial: ${metadata.name}`);
        } catch (error) {
            Logger.error(`Failed to load tutorial "${folder}"`, error);
        }
    }
}
