import * as vscode from 'vscode';

/**
 * Logger utility for the Cesium Sandcastle extension
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel;

    private constructor() {}

    public static initialize(name: string): void {
        this.outputChannel = vscode.window.createOutputChannel(name);
    }

    public static info(message: string, ...args: any[]): void {
        const formattedMessage = this.formatMessage('INFO', message, args);
        this.outputChannel.appendLine(formattedMessage);
    }

    public static warn(message: string, ...args: any[]): void {
        const formattedMessage = this.formatMessage('WARN', message, args);
        this.outputChannel.appendLine(formattedMessage);
    }

    public static error(message: string, error?: Error | unknown, ...args: any[]): void {
        const formattedMessage = this.formatMessage('ERROR', message, args);
        this.outputChannel.appendLine(formattedMessage);
        
        if (error instanceof Error) {
            this.outputChannel.appendLine(`  Stack: ${error.stack}`);
        } else if (error) {
            this.outputChannel.appendLine(`  Error: ${String(error)}`);
        }
    }

    public static debug(message: string, ...args: any[]): void {
        const formattedMessage = this.formatMessage('DEBUG', message, args);
        this.outputChannel.appendLine(formattedMessage);
    }

    public static show(): void {
        this.outputChannel.show();
    }

    public static dispose(): void {
        if (this.outputChannel) {
            this.outputChannel.dispose();
        }
    }

    private static formatMessage(level: string, message: string, args: any[]): string {
        const timestamp = new Date().toISOString();
        const argsString = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
        return `[${timestamp}] [${level}] ${message}${argsString}`;
    }
}
