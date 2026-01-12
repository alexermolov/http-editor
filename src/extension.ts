import * as vscode from 'vscode';
import { HttpEditorWebviewProvider } from './webview/webviewProvider';
import { ConfigManager } from './config/configManager';
import { logger } from './utils/logger';

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
    try {
        // Suppress navigator deprecation warning from axios
        // This is a known issue with axios in VS Code extensions
        // See: https://aka.ms/vscode-extensions/navigator
        const originalEmit = process.emit;
        process.emit = function(event: any, ...args: any[]) {
            if (event === 'warning' && args[0]?.name === 'PendingMigrationError') {
                return false;
            }
            return originalEmit.apply(process, [event, ...args] as any);
        } as any;

        // Disable SSL certificate verification globally to handle proxy issues
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        
        logger.info('Extension is activating...');
        
        const webviewProvider = new HttpEditorWebviewProvider(context);
        const configManager = new ConfigManager();

        // Register editor command
        const openEditorCommand = vscode.commands.registerCommand(
            'httpEditor.openEditor',
            async (uri?: vscode.Uri) => {
                try {
                    logger.debug('openEditor command invoked', uri?.fsPath);
                    
                    // If URI not provided, use active editor
                    if (!uri) {
                        const activeEditor = vscode.window.activeTextEditor;
                        if (activeEditor) {
                            uri = activeEditor.document.uri;
                        } else {
                            vscode.window.showErrorMessage('No file selected');
                            return;
                        }
                    }

                    await webviewProvider.openEditor(uri);
                } catch (error) {
                    logger.error('Error in openEditor command', error);
                    vscode.window.showErrorMessage(`Failed to open HTTP Editor: ${error}`);
                }
            }
        );

        // Register create config command
        const createConfigCommand = vscode.commands.registerCommand(
            'httpEditor.createConfig',
            async () => {
                try {
                    await configManager.createExampleConfig();
                } catch (error) {
                    logger.error('Error creating config', error);
                    vscode.window.showErrorMessage(`Failed to create config: ${error}`);
                }
            }
        );

        context.subscriptions.push(openEditorCommand);
        context.subscriptions.push(createConfigCommand);
        context.subscriptions.push(webviewProvider);
        
        logger.info('Extension is now active');
    } catch (error) {
        logger.error('Error during activation', error);
        vscode.window.showErrorMessage(`Failed to activate HTTP Editor: ${error}`);
    }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    logger.info('Extension is now deactivated');
}
