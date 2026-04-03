import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

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
            (message: { command: string; text?: string; url?: string }) => {
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
                    case 'openPreview':
                        if (message.url) {
                            vscode.commands.executeCommand('simpleBrowser.show', message.url);
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
        const column = vscode.window.activeTextEditor?.viewColumn;

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
        try {
            // Use tutorial HTML and inject JavaScript (for CDN projects)
            if (this._tutorialHtml) {
                return this._injectCodeIntoHtml(this._tutorialHtml, this._tutorialCode, this._tutorialCss);
            }

            // If no tutorial provided, load empty template
            const templatePath = path.join(this._extensionUri.fsPath, 'out', 'templates', 'globeEmpty.html');
            return fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            Logger.error('Failed to load globe template', error);
            return "";
        }
    }

    private _injectCodeIntoHtml(html: string, jsCode?: string, cssCode?: string): string {
        let result = html;
        
        // Replace script tags with inline JavaScript
        // Match local .js files but not CDN URLs (no http/https)
        if (jsCode) {
            result = result.replace(
                /<script\s+src=["'](?!https?:)([^"']+\.js)["']\s*><\/script>/gi,
                `<script>${jsCode}</script>`
            );

            result = result.replace(
                /<script\s+type=["']module["']\s+src=["'](?!https?:)([^"']+\.js)["']\s*><\/script>/gi,
                `<script>${jsCode}</script>`
            );
        }
        
        // Replace link tags with inline CSS
        // Match local .css files but not CDN URLs (no http/https)
        if (cssCode) {
            result = result.replace(
                /<link\s+href=["'](?!https?:)([^"']+\.css)["']\s+rel=["']stylesheet["']\s*\/?>/gi,
                `<style>${cssCode}</style>`
            );
        }
        
        return result;
    }
}
