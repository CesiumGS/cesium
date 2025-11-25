import * as vscode from 'vscode';
import { ApiItem } from '../models/apiItem';
import * as constants from '../utils/constants';

export class ApiReferenceItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly apiItem?: ApiItem
    ) {
        super(label, collapsibleState);

        if (contextValue === constants.CONTEXT_VALUE_API_ITEM && apiItem) {
            this.tooltip = `${apiItem.name} (${apiItem.type})\n${apiItem.description}`;
            this.description = apiItem.type;
            this.command = {
                command: constants.COMMAND_OPEN_API_DOC,
                title: 'Open API Documentation',
                arguments: [apiItem]
            };
            
            // Set icon based on type
            this.iconPath = this.getIconForType(apiItem.type);
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }

    private getIconForType(type: ApiItem['type']): vscode.ThemeIcon {
        const iconMap: Record<ApiItem['type'], string> = {
            'class': 'symbol-class',
            'namespace': 'symbol-namespace',
            'method': 'symbol-method',
            'property': 'symbol-property'
        };
        return new vscode.ThemeIcon(iconMap[type] || 'symbol-method');
    }
}