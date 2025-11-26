import * as vscode from 'vscode';
import { CesiumGlobePanel } from '../panels/cesiumGlobePanel';
import { Logger } from '../utils/logger';
import * as constants from '../utils/constants';

/**
 * Handles all commands related to the Cesium Globe viewer
 */
export class GlobeCommandHandler {
    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Register all globe-related commands
     */
    registerCommands(): void {
        this.context.subscriptions.push(
            vscode.commands.registerCommand(constants.COMMAND_SHOW_GLOBE, () => this.showGlobe())
        );
    }

    private showGlobe(): void {
        Logger.info('Showing Cesium Globe');
        CesiumGlobePanel.createOrShow(this.context.extensionUri);
    }
}
