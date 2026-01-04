import * as vscode from 'vscode';
import { HttpEditorWebviewProvider } from './webview/webviewProvider';
import { ConfigManager } from './config/configManager';

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
    try {
        // Disable SSL certificate verification globally to handle proxy issues
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        
        console.log('HTTP Editor extension is activating...');
        
        const webviewProvider = new HttpEditorWebviewProvider(context);
        const configManager = new ConfigManager();

        // Register editor command
        const openEditorCommand = vscode.commands.registerCommand(
            'httpEditor.openEditor',
            async (uri?: vscode.Uri) => {
                try {
                    console.log('HTTP Editor: openEditor command invoked', uri?.fsPath);
                    
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
                    console.error('HTTP Editor: Error in openEditor command', error);
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
                    console.error('HTTP Editor: Error creating config', error);
                    vscode.window.showErrorMessage(`Failed to create config: ${error}`);
                }
            }
        );

        context.subscriptions.push(openEditorCommand);
        context.subscriptions.push(createConfigCommand);
        context.subscriptions.push(webviewProvider);
        
        console.log('HTTP Editor extension is now active');
        vscode.window.showInformationMessage('HTTP Editor extension activated successfully!');
    } catch (error) {
        console.error('HTTP Editor: Error during activation', error);
        vscode.window.showErrorMessage(`Failed to activate HTTP Editor: ${error}`);
    }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    console.log('HTTP Editor extension is now deactivated');
}
