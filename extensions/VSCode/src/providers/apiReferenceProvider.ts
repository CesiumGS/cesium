import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { Logger } from '../utils/logger';
import { FileSystemHelper } from '../utils/fileSystem';
import * as constants from '../utils/constants';
import { ApiItem } from '../models/apiItem';
import { ApiReferenceItem } from './apiReferenceItem';



export class ApiReferenceProvider implements vscode.TreeDataProvider<ApiReferenceItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ApiReferenceItem | undefined | null | void> = new vscode.EventEmitter<ApiReferenceItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ApiReferenceItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private apiItems: ApiItem[] = [];
    private searchQuery: string = '';
    private readonly extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        void this.loadApiReference();
    }

    refresh(): void {
        this.loadApiReference();
        this._onDidChangeTreeData.fire();
        Logger.info('API reference refreshed');
    }

    setSearchQuery(query: string): void {
        this.searchQuery = query.toLowerCase().trim();
        this._onDidChangeTreeData.fire();
        Logger.debug('API search query set', query);
    }

    clearSearch(): void {
        this.searchQuery = '';
        this._onDidChangeTreeData.fire();
        Logger.debug('API search cleared');
    }

    getTreeItem(element: ApiReferenceItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ApiReferenceItem): Thenable<ApiReferenceItem[]> {
        if (!element) {
            // If search is active, return filtered items directly without categories
            if (this.searchQuery) {
                const filtered = this.getFilteredApiItems();
                return Promise.resolve(
                    filtered.map(item => new ApiReferenceItem(
                        item.name,
                        vscode.TreeItemCollapsibleState.None,
                        constants.CONTEXT_VALUE_API_ITEM,
                        item
                    ))
                );
            }
            
            // Return categories
            const categories = this.getCategories();
            return Promise.resolve(
                categories.map(cat => new ApiReferenceItem(
                    cat,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    constants.CONTEXT_VALUE_CATEGORY
                ))
            );
        } else if (element.contextValue === constants.CONTEXT_VALUE_CATEGORY) {
            // Return API items for this category
            const items = this.apiItems.filter(item => item.category === element.label);
            return Promise.resolve(
                items.map(item => new ApiReferenceItem(
                    item.name,
                    vscode.TreeItemCollapsibleState.None,
                    constants.CONTEXT_VALUE_API_ITEM,
                    item
                ))
            );
        }
        return Promise.resolve([]);
    }

    private getFilteredApiItems(): ApiItem[] {
        if (!this.searchQuery) {
            return this.apiItems;
        }
        
        return this.apiItems.filter(item => {
            const searchLower = this.searchQuery.toLowerCase();
            return item.name.toLowerCase().includes(searchLower) ||
                   item.description.toLowerCase().includes(searchLower) ||
                   item.category.toLowerCase().includes(searchLower) ||
                   item.type.toLowerCase().includes(searchLower);
        });
    }

    private getCategories(): string[] {
        const categories = new Set(this.apiItems.map(item => item.category));
        return Array.from(categories).sort();
    }

    private async loadApiReference(): Promise<void> {
        try {
            const yamlPath = vscode.Uri.joinPath(this.extensionUri, 'out', 'data', 'apiReference.yaml');
            const yamlContent = await FileSystemHelper.readFile(yamlPath);
            const items = yaml.load(yamlContent) as ApiItem[];
            
            if (Array.isArray(items)) {
                this.apiItems = items;
                Logger.info(`Loaded ${this.apiItems.length} API items from YAML`);
                this._onDidChangeTreeData.fire();
            } else {
                Logger.error('Invalid YAML format: expected array of items');
            }
        } catch (error) {
            Logger.error('Failed to load API reference from YAML, using fallback', error);
        }
    }
}
