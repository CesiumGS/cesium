import * as vscode from 'vscode';
import { Tutorial } from "../models/tutorial";
import * as constants from '../utils/constants';

export class TutorialItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly tutorial?: Tutorial
    ) {
        super(label, collapsibleState);

        if (contextValue === constants.CONTEXT_VALUE_TUTORIAL && tutorial) {
            this.tooltip = `${tutorial.description}\n\nClick to view in Cesium Globe (read-only)\nClick folder icon to export files to workspace`;
            this.description = tutorial.description;
            this.command = {
                command: constants.COMMAND_OPEN_TUTORIAL,
                title: 'Open Tutorial in Globe',
                arguments: [tutorial]
            };
            this.iconPath = new vscode.ThemeIcon('file-code');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}