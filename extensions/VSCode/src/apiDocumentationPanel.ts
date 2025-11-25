import * as vscode from 'vscode';
import * as https from 'https';
import { Logger } from './utils/logger';
import { TemplateLoader } from './utils/templateLoader';
import { ApiItem } from './models/apiItem';

const BASE_CESIUM_DOC_URL = 'https://cesium.com/learn/cesiumjs/ref-doc/';

export class ApiDocumentationPanel {
    public static currentPanel: ApiDocumentationPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];


    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            (message: { command: string; url?: string }) => {
                switch (message.command) {
                    case 'openExternal':
                        if (message.url) {
                            Logger.info('Opening external URL', message.url);
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        return;
                }
            },
            null,
            this._disposables
        );

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri, apiItem: ApiItem): void {
        const column = vscode.ViewColumn.Two;

        // If we already have a panel, show it and update content
        if (ApiDocumentationPanel.currentPanel) {
            ApiDocumentationPanel.currentPanel._panel.reveal(column);
            ApiDocumentationPanel.currentPanel._update(apiItem);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'cesiumApiDoc',
            `API: ${apiItem.name}`,
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        ApiDocumentationPanel.currentPanel = new ApiDocumentationPanel(panel, extensionUri);
        ApiDocumentationPanel.currentPanel._update(apiItem);
    }

    private _update(apiItem: ApiItem): void {
        this._panel.title = `API: ${apiItem.name}`;
        
        // Show loading state first
        this._showLoadingState(apiItem);

        // Fetch the documentation HTML
        Logger.info('Fetching API documentation', apiItem.url);
        
        this._fetchDocumentation(apiItem.url)
            .then(html => {
                this._showContent(html, apiItem);
                Logger.info('API documentation loaded successfully', apiItem.name);
            })
            .catch(error => {
                Logger.error('Failed to fetch API documentation', error);
                this._showError(apiItem, error);
            });
    }

    private async _showLoadingState(apiItem: ApiItem): Promise<void> {
        try {
            const html = await TemplateLoader.loadAndReplace(
                this._extensionUri,
                'apiLoading.html',
                {
                    'API_NAME': this.escapeHtml(apiItem.name)
                }
            );
            this._panel.webview.html = html;
        } catch (error) {
            Logger.error('Failed to load loading template', error);
        }
    }

    private async _showContent(fetchedHtml: string, apiItem: ApiItem): Promise<void> {
        try {
            // Extract the main content from the fetched HTML
            const bodyMatch = fetchedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const headMatch = fetchedHtml.match(/<head[^>]*>([\s\S]*)<\/head>/i);
            
            let bodyContent = bodyMatch ? bodyMatch[1] : fetchedHtml;
            let headContent = headMatch ? headMatch[1] : '';

            // Clean up relative URLs to make them absolute
            bodyContent = bodyContent.replace(/href="(?!http|#)([^"]*)"/g, `href="${BASE_CESIUM_DOC_URL}$1"`);
            bodyContent = bodyContent.replace(/src="(?!http)([^"]*)"/g, `src="${BASE_CESIUM_DOC_URL}$1"`);
            
            headContent = headContent.replace(/href="(?!http)([^"]*\.css)"/g, `href="${BASE_CESIUM_DOC_URL}$1"`);
            headContent = headContent.replace(/src="(?!http)([^"]*\.js)"/g, `src="${BASE_CESIUM_DOC_URL}$1"`);

            const html = await TemplateLoader.loadAndReplace(
                this._extensionUri,
                'apiDocumentation.html',
                {
                    'API_NAME': this.escapeHtml(apiItem.name),
                    'API_TYPE': this.escapeHtml(apiItem.type),
                    'API_DESCRIPTION': this.escapeHtml(apiItem.description),
                    'API_URL': this.escapeHtml(apiItem.url),
                    'HEAD_CONTENT': headContent,
                    'BODY_CONTENT': bodyContent
                }
            );
            
            this._panel.webview.html = html;
        } catch (error) {
            Logger.error('Failed to render content', error);
            this._showError(apiItem, error instanceof Error ? error : new Error(String(error)));
        }
    }

    private async _showError(apiItem: ApiItem, error: Error): Promise<void> {
        try {
            const html = await TemplateLoader.loadAndReplace(
                this._extensionUri,
                'apiError.html',
                {
                    'API_NAME': this.escapeHtml(apiItem.name),
                    'API_URL': this.escapeHtml(apiItem.url),
                    'ERROR_MESSAGE': this.escapeHtml(error.message)
                }
            );
            this._panel.webview.html = html;
        } catch (loadError) {
            Logger.error('Failed to load error template, trying fallback', loadError);
            await this._showFallbackError(apiItem, error);
        }
    }

    private async _showFallbackError(apiItem: ApiItem, error: Error): Promise<void> {
        try {
            const html = await TemplateLoader.loadAndReplace(
                this._extensionUri,
                'apiFallbackError.html',
                {
                    'API_NAME': this.escapeHtml(apiItem.name),
                    'API_URL': this.escapeHtml(apiItem.url),
                    'ERROR_MESSAGE': this.escapeHtml(error.message)
                }
            );
            this._panel.webview.html = html;
        } catch (fallbackError) {
            Logger.error('Failed to load fallback error template', fallbackError);
        }
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    private async _fetchDocumentation(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    if (response.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}`));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    public dispose(): void {
        ApiDocumentationPanel.currentPanel = undefined;

        // Clean up resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
        
        Logger.info('API Documentation panel disposed');
    }
}
