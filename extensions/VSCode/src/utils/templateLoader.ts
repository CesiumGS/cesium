import * as vscode from 'vscode';
import { FileSystemHelper } from './fileSystem';

/**
 * Template loader for HTML templates
 */
export class TemplateLoader {
    private static cache: Map<string, string> = new Map();

    /**
     * Load an HTML template from the templates directory
     */
    static async loadTemplate(
        extensionUri: vscode.Uri,
        templateName: string
    ): Promise<string> {
        const cacheKey = templateName;
        
        // Return from cache if available
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        // Load from file
        const templatePath = vscode.Uri.joinPath(
            extensionUri,
            'src',
            'templates',
            templateName
        );

        const content = await FileSystemHelper.readFile(templatePath);
        this.cache.set(cacheKey, content);
        
        return content;
    }

    /**
     * Replace placeholders in template with values
     */
    static replacePlaceholders(
        template: string,
        replacements: Record<string, string>
    ): string {
        let result = template;
        
        for (const [key, value] of Object.entries(replacements)) {
            const placeholder = `{{${key}}}`;
            result = result.split(placeholder).join(value);
        }
        
        return result;
    }

    /**
     * Load template and replace placeholders in one call
     */
    static async loadAndReplace(
        extensionUri: vscode.Uri,
        templateName: string,
        replacements: Record<string, string>
    ): Promise<string> {
        const template = await this.loadTemplate(extensionUri, templateName);
        return this.replacePlaceholders(template, replacements);
    }

    /**
     * Clear the template cache
     */
    static clearCache(): void {
        this.cache.clear();
    }
}
