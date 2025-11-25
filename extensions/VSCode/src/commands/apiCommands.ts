import * as vscode from 'vscode';
import { ApiDocumentationPanel } from '../apiDocumentationPanel';
import { ApiReferenceProvider } from '../providers/apiReferenceProvider';
import { Logger } from '../utils/logger';
import * as constants from '../utils/constants';

/**
 * Handles all commands related to API reference
 */
export class ApiCommandHandler {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly apiReferenceProvider: ApiReferenceProvider
    ) {}

    /**
     * Register all API-related commands
     */
    registerCommands(): void {
        this.context.subscriptions.push(
            vscode.commands.registerCommand(constants.COMMAND_OPEN_API_DOC, (apiItem) => this.openApiDoc(apiItem)),
            vscode.commands.registerCommand(constants.COMMAND_SEARCH_API, () => this.searchApi()),
            vscode.commands.registerCommand(constants.COMMAND_CLEAR_API_SEARCH, () => this.clearApiSearch())
        );
    }

    private async openApiDoc(apiItem: any): Promise<void> {
        if (apiItem && apiItem.url) {
            Logger.info('Opening API documentation', apiItem.name);
            ApiDocumentationPanel.createOrShow(this.context.extensionUri, apiItem);
        }
    }

    private async searchApi(): Promise<void> {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Search Cesium API',
            placeHolder: 'Enter class name, method, or keyword...'
        });

        if (searchTerm !== undefined) {
            Logger.info('Searching API', searchTerm);
            this.apiReferenceProvider.setSearchQuery(searchTerm);
            if (searchTerm) {
                vscode.window.showInformationMessage(`Filtered API: "${searchTerm}"`);
            }
        }
    }

    private clearApiSearch(): void {
        Logger.info('Clearing API search');
        this.apiReferenceProvider.clearSearch();
        vscode.window.showInformationMessage(constants.MSG_API_SEARCH_CLEARED);
    }
}
