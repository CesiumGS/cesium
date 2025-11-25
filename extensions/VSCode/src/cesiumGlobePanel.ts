import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './utils/logger';

export class CesiumGlobePanel {
    public static currentPanel: CesiumGlobePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _tutorialCode?: string;
    private _tutorialHtml?: string;
    private _tutorialCss?: string;


    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        tutorialCode?: string,
        tutorialHtml?: string,
        tutorialCss?: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._tutorialCode = tutorialCode;
        this._tutorialHtml = tutorialHtml;
        this._tutorialCss = tutorialCss;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            (message: { command: string; text?: string }) => {
                switch (message.command) {
                    case 'alert':
                        if (message.text) {
                            Logger.info('Globe alert', message.text);
                            vscode.window.showInformationMessage(message.text);
                        }
                        return;
                    case 'error':
                        if (message.text) {
                            Logger.error('Globe error', new Error(message.text));
                            vscode.window.showErrorMessage(message.text);
                        }
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        tutorialCode?: string,
        tutorialHtml?: string,
        tutorialCss?: string
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, update it with new code
        if (CesiumGlobePanel.currentPanel) {
            Logger.info('Updating existing Cesium Globe panel');
            CesiumGlobePanel.currentPanel._tutorialCode = tutorialCode;
            CesiumGlobePanel.currentPanel._tutorialHtml = tutorialHtml;
            CesiumGlobePanel.currentPanel._tutorialCss = tutorialCss;
            CesiumGlobePanel.currentPanel._update();
            CesiumGlobePanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        Logger.info('Creating new Cesium Globe panel');
        const panel = vscode.window.createWebviewPanel(
            'cesiumGlobe',
            'Cesium Globe',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        CesiumGlobePanel.currentPanel = new CesiumGlobePanel(
            panel,
            extensionUri,
            tutorialCode,
            tutorialHtml,
            tutorialCss
        );
    }

    public static updateCode(
        tutorialCode: string,
        tutorialHtml?: string,
        tutorialCss?: string
    ): void {
        if (CesiumGlobePanel.currentPanel) {
            Logger.info('Updating tutorial code in panel');
            CesiumGlobePanel.currentPanel._tutorialCode = tutorialCode;
            if (tutorialHtml) {
                CesiumGlobePanel.currentPanel._tutorialHtml = tutorialHtml;
            }
            if (tutorialCss) {
                CesiumGlobePanel.currentPanel._tutorialCss = tutorialCss;
            }
            CesiumGlobePanel.currentPanel._update();
        }
    }

    public dispose(): void {
        CesiumGlobePanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
        
        Logger.info('Cesium Globe panel disposed');
    }

    private _update(): void {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview(): string {
        // Use tutorial HTML and inject JavaScript
        if (this._tutorialHtml) {
            // Replace the <script src="main.js"></script> with inline script
            let html = this._tutorialHtml;
            if (this._tutorialCode) {
                // Find and replace the main.js script tag with inline script
                html = html.replace(
                    /<script\s+src=["']main\.js["']\s*><\/script>/gi,
                    `<script>${this._tutorialCode}</script>`
                );
            }
            
            // Replace the <link href="styles.css"> with inline styles if we have CSS content
            // This ensures CSS is properly loaded in the webview
            if (this._tutorialCss) {
                html = html.replace(
                    /<link\s+href=["']styles\.css["']\s+rel=["']stylesheet["']\s*\/?>/gi,
                    `<style>${this._tutorialCss}</style>`
                );
            }
            
            return html;
        }

        // If no tutorial HTML provided, load from template
        try {
            const templatePath = path.join(this._extensionUri.fsPath, 'out', 'templates', 'globeEmpty.html');
            return fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            Logger.error('Failed to load globe empty template', error);
            return "";
        }
    }
}
