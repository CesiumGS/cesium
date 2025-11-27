import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Logger } from '../logger';
import { FileSystemHelper } from '../fileSystem';
import * as patterns from '../codePatterns';
import * as constants from '../constants';

/**
 * Manages Cesium Ion access tokens for the extension
 */
export class TokenManager {
    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Inject the access token into JavaScript code that contains a placeholder
     */
    public async injectAccessToken(jsCode: string): Promise<string> {
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
    public async promptForAccessToken(): Promise<string | undefined> {
        const action = await vscode.window.showWarningMessage(
            constants.MSG_TOKEN_NOT_FOUND,
            constants.MSG_TOKEN_ACTION_ENTER,
            constants.MSG_TOKEN_ACTION_GET,
            constants.MSG_TOKEN_ACTION_SKIP
        );

        if (action === constants.MSG_TOKEN_ACTION_ENTER) {
            const token = await vscode.window.showInputBox({
                prompt: constants.MSG_TOKEN_PROMPT,
                placeHolder: constants.MSG_TOKEN_PLACEHOLDER,
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return constants.MSG_TOKEN_EMPTY_ERROR;
                    }
                    if (!value.startsWith('eyJ')) {
                        return constants.MSG_TOKEN_INVALID_FORMAT;
                    }
                    return null;
                }
            });

            if (token) {
                // Save token to global state
                await this.context.globalState.update('cesiumIonAccessToken', token);
                
                // Ask if user wants to save to .env file
                const saveToEnv = await vscode.window.showInformationMessage(
                    constants.MSG_TOKEN_SAVE_TO_ENV,
                    constants.MSG_TOKEN_ACTION_YES,
                    constants.MSG_TOKEN_ACTION_NO
                );

                if (saveToEnv === constants.MSG_TOKEN_ACTION_YES) {
                    await this.saveTokenToEnvFile(token);
                }

                Logger.info('Cesium Ion access token saved');
                return token;
            }
        } else if (action === constants.MSG_TOKEN_ACTION_GET) {
            await vscode.env.openExternal(vscode.Uri.parse('https://ion.cesium.com/tokens'));
            // Recursively prompt again after opening the website
            return await this.promptForAccessToken();
        }

        return undefined;
    }

    /**
     * Get the access token from various sources (env, global state, or prompt)
     */
    public async getAccessToken(): Promise<string | undefined> {
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
     * Save the access token to the .env file in the extension root
     */
    private async saveTokenToEnvFile(token: string): Promise<void> {
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

            vscode.window.showInformationMessage(constants.MSG_TOKEN_SAVED_TO_ENV);
            Logger.info(constants.MSG_TOKEN_SAVED_TO_ENV);
        } catch (error) {
            Logger.error('Failed to save token to .env file', error);
            vscode.window.showErrorMessage(`Failed to save token to .env file: ${error}`);
        }
    }
}
