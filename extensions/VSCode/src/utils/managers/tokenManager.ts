import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Logger } from '../logger';
import { FileSystemHelper } from '../fileSystem';
import * as patterns from '../codePatterns';

/**
 * Manages Cesium Ion access tokens for the extension
 */
export class TokenManager {
    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Get the access token from various sources (env, global state, or prompt)
     */
    async getAccessToken(): Promise<string | undefined> {
        // Load .env file from extension root
        const envPath = path.join(this.context.extensionPath, '.env');
        dotenv.config({ path: envPath });

        let token = process.env.CESIUM_ION_ACCESS_TOKEN;
        
        // If no token in .env, check global state
        if (!token) {
            token = this.context.globalState.get<string>('cesiumIonAccessToken');
        }

        return token;
    }

    /**
     * Inject the access token into JavaScript code that contains a placeholder
     */
    async injectAccessToken(jsCode: string): Promise<string> {
        if (!jsCode.includes(patterns.TOKEN_PLACEHOLDER)) {
            return jsCode;
        }

        let token = await this.getAccessToken();
        
        // If still no token, prompt user to enter it
        if (!token) {
            token = await this.promptForAccessToken();
        }
        
        if (token) {
            Logger.info('Injecting Cesium Ion access token');
            return jsCode.replace(patterns.TOKEN_PLACEHOLDER_REGEX, token);
        }
        
        Logger.warn('No Cesium Ion access token available');
        return jsCode;
    }

    /**
     * Prompt the user to enter their Cesium Ion access token
     */
    async promptForAccessToken(): Promise<string | undefined> {
        const action = await vscode.window.showWarningMessage(
            'Cesium Ion access token not found. Tutorials may not work without it.',
            'Enter Token',
            'Get Token from Cesium.com',
            'Skip'
        );

        if (action === 'Enter Token') {
            const token = await vscode.window.showInputBox({
                prompt: 'Enter your Cesium Ion access token',
                placeHolder: 'eyJhbGciOiJI...',
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Token cannot be empty';
                    }
                    if (!value.startsWith('eyJ')) {
                        return 'Invalid token format';
                    }
                    return null;
                }
            });

            if (token) {
                // Save token to global state
                await this.context.globalState.update('cesiumIonAccessToken', token);
                
                // Ask if user wants to save to .env file
                const saveToEnv = await vscode.window.showInformationMessage(
                    'Token saved for this session. Would you like to save it to .env file for future use?',
                    'Yes',
                    'No'
                );

                if (saveToEnv === 'Yes') {
                    await this.saveTokenToEnvFile(token);
                }

                Logger.info('Cesium Ion access token saved');
                return token;
            }
        } else if (action === 'Get Token from Cesium.com') {
            await vscode.env.openExternal(vscode.Uri.parse('https://ion.cesium.com/tokens'));
            // Recursively prompt again after opening the website
            return await this.promptForAccessToken();
        }

        return undefined;
    }

    /**
     * Save the access token to the .env file in the extension root
     */
    async saveTokenToEnvFile(token: string): Promise<void> {
        try {
            const envPath = path.join(this.context.extensionPath, '.env');
            let envContent = '';

            // Read existing .env file if it exists
            try {
                const envUri = vscode.Uri.file(envPath);
                envContent = await FileSystemHelper.readFile(envUri);
            } catch {
                // File doesn't exist, start with template
                envContent = '# Cesium Ion Access Token\n# Get your token from: https://ion.cesium.com/tokens\n';
            }

            // Update or add token
            const tokenKey = patterns.ENV_TOKEN_KEY;
            if (envContent.includes(`${tokenKey}=`)) {
                envContent = envContent.replace(
                    patterns.ENV_TOKEN_ASSIGNMENT_REGEX,
                    `${tokenKey}=${token}`
                );
            } else {
                envContent += `\n${tokenKey}=${token}\n`;
            }

            // Write back to file
            const envUri = vscode.Uri.file(envPath);
            await FileSystemHelper.writeFile(envUri, envContent);

            vscode.window.showInformationMessage('Token saved to .env file');
            Logger.info('Token saved to .env file');
        } catch (error) {
            Logger.error('Failed to save token to .env file', error);
            vscode.window.showErrorMessage(`Failed to save token to .env file: ${error}`);
        }
    }
}
