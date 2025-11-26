import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HttpRequest, Message, SendRequestMessage, SaveRequestsMessage, ExportToCurlMessage, ImportRequestsMessage, ExecutePreAuthMessage } from '../types';
import { HttpFileParser } from '../parser/httpParser';
import { HttpClient } from '../http/httpClient';
import { WebviewContentGenerator } from './webviewContent';
import { CurlExporter } from '../utils/curlExporter';
import { ImportParser } from '../utils/importParser';

/**
 * Provider for managing WebView panel
 */
export class HttpEditorWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private readonly parser: HttpFileParser;
    private readonly httpClient: HttpClient;
    private readonly contentGenerator: WebviewContentGenerator;
    private readonly curlExporter: CurlExporter;
    private readonly importParser: ImportParser;
    private fileUri: vscode.Uri | undefined;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.parser = new HttpFileParser();
        this.httpClient = new HttpClient();
        this.contentGenerator = new WebviewContentGenerator();
        this.curlExporter = new CurlExporter();
        this.importParser = new ImportParser();
    }

    /**
     * Opens editor for specified file
     */
    public async openEditor(uri: vscode.Uri): Promise<void> {
        try {
            console.log('HTTP Editor: Opening editor for', uri.fsPath);
            
            // Check file extension
            if (!uri.fsPath.endsWith('.http')) {
                vscode.window.showErrorMessage('Please select a .http file');
                return;
            }

            this.fileUri = uri;

            // Создаем или показываем WebView панель
            if (this.panel) {
                console.log('HTTP Editor: Revealing existing panel');
                this.panel.reveal(vscode.ViewColumn.One);
            } else {
                console.log('HTTP Editor: Creating new panel');
                this.createWebviewPanel(uri);
            }

            // Загружаем и отображаем содержимое
            console.log('HTTP Editor: Loading content');
            await this.loadAndDisplayContent(uri);
            console.log('HTTP Editor: Editor opened successfully');
        } catch (error) {
            console.error('HTTP Editor: Error in openEditor', error);
            throw error;
        }
    }

    /**
     * Creates new WebView panel
     */
    private createWebviewPanel(uri: vscode.Uri): void {
        this.panel = vscode.window.createWebviewPanel(
            'httpEditor',
            `HTTP Editor - ${path.basename(uri.fsPath)}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: []
            }
        );

        // Handle panel closing
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.context.subscriptions);

        // Handle messages from WebView
        this.panel.webview.onDidReceiveMessage(
            async (message: Message) => {
                await this.handleMessage(message);
            },
            null,
            this.context.subscriptions
        );
    }

    /**
     * Loads and displays file content
     */
    private async loadAndDisplayContent(uri: vscode.Uri): Promise<void> {
        if (!this.panel) {
            return;
        }

        try {
            // Read file content
            const fileContent = fs.readFileSync(uri.fsPath, 'utf8');

            // Parse requests
            const requests = this.parser.parse(fileContent);

            // Generate and set HTML
            this.panel.webview.html = this.contentGenerator.generate(requests, uri.fsPath);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load file: ${error}`);
        }
    }

    /**
     * Handles messages from WebView
     */
    private async handleMessage(message: Message): Promise<void> {
        switch (message.command) {
            case 'sendRequest':
                await this.handleSendRequest(message as SendRequestMessage);
                break;
            case 'saveRequests':
                await this.handleSaveRequests(message as SaveRequestsMessage);
                break;
            case 'exportToCurl':
                await this.handleExportToCurl(message as ExportToCurlMessage);
                break;
            case 'importRequests':
                await this.handleImportRequests(message as ImportRequestsMessage);
                break;
            case 'executePreAuth':
                await this.handleExecutePreAuth(message as ExecutePreAuthMessage);
                break;
            case 'log':
                console.log('[WebView]', message.text);
                break;
        }
    }

    /**
     * Handles sending HTTP request
     */
    private async handleSendRequest(message: SendRequestMessage): Promise<void> {
        if (!this.panel) {
            return;
        }

        try {
            const response = await this.httpClient.send(message.request);

            this.panel.webview.postMessage({
                command: 'requestComplete',
                response
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Request failed: ${error}`);
        }
    }

    /**
     * Handles saving requests
     */
    private async handleSaveRequests(message: SaveRequestsMessage): Promise<void> {
        if (!this.panel || !this.fileUri) {
            return;
        }

        try {
            const content = this.parser.serialize(message.requests);
            fs.writeFileSync(this.fileUri.fsPath, content, 'utf8');

            vscode.window.showInformationMessage('Requests saved successfully');

            this.panel.webview.postMessage({
                command: 'saveComplete',
                success: true
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save requests: ${error}`);

            this.panel.webview.postMessage({
                command: 'saveComplete',
                success: false
            });
        }
    }

    /**
     * Handles export to cURL
     */
    private async handleExportToCurl(message: ExportToCurlMessage): Promise<void> {
        try {
            // Detect platform
            const isWindows = process.platform === 'win32';
            const curlCommand = isWindows 
                ? this.curlExporter.exportForWindows(message.request)
                : this.curlExporter.export(message.request);

            // Copy to clipboard
            await vscode.env.clipboard.writeText(curlCommand);

            // Show notification
            vscode.window.showInformationMessage('cURL command copied to clipboard!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export to cURL: ${error}`);
        }
    }

    /**
     * Handles import requests from Postman collection or cURL
     */
    private async handleImportRequests(message: ImportRequestsMessage): Promise<void> {
        if (!this.panel) {
            return;
        }

        try {
            const importedRequests = this.importParser.parse(message.content);

            this.panel.webview.postMessage({
                command: 'importComplete',
                success: true,
                requests: importedRequests
            });

            vscode.window.showInformationMessage(`Successfully imported ${importedRequests.length} request(s)`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            this.panel.webview.postMessage({
                command: 'importComplete',
                success: false,
                error: errorMessage
            });

            vscode.window.showErrorMessage(`Import failed: ${errorMessage}`);
        }
    }

    /**
     * Handles pre-auth request execution
     */
    private async handleExecutePreAuth(message: ExecutePreAuthMessage): Promise<void> {
        if (!this.panel) {
            return;
        }

        try {
            const preAuth = message.preAuth;
            
            console.log('Pre-auth: Starting with config:', {
                hasCurlCommand: !!preAuth.curlCommand,
                hasUsername: !!preAuth.username,
                hasPassword: !!preAuth.password,
                responsePath: preAuth.responsePath,
                variables: message.variables
            });
            
            // Parse the cURL command
            let curlCommand = preAuth.curlCommand;
            
            // Replace variables from request context
            if (message.variables) {
                Object.entries(message.variables).forEach(([name, value]) => {
                    const pattern = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g');
                    curlCommand = curlCommand.replace(pattern, value);
                });
            }
            
            // Replace username and password placeholders
            // Use form fields first, fallback to variables 'login' and 'password'
            // Filter out empty strings from variables
            const loginVar = message.variables?.['login'];
            const passwordVar = message.variables?.['password'];
            const username = preAuth.username || (loginVar && loginVar.trim() ? loginVar : '');
            const password = preAuth.password || (passwordVar && passwordVar.trim() ? passwordVar : '');
            
            if (username) {
                curlCommand = curlCommand.replace(/\{\{username\}\}/g, username);
            }
            if (password) {
                curlCommand = curlCommand.replace(/\{\{password\}\}/g, password);
            }
            
            console.log('Pre-auth: Parsed cURL command:', curlCommand);
            
            // Parse cURL to HttpRequest
            const authRequest = this.importParser.parseCurl(curlCommand);
            
            console.log('Pre-auth: Parsed auth request:', {
                method: authRequest.method,
                url: authRequest.url,
                headers: authRequest.headers,
                hasBody: !!authRequest.body,
                body: authRequest.body,
                bodyType: authRequest.bodyType
            });
            
            // Execute the auth request
            const response = await this.httpClient.send(authRequest);
            
            console.log('Pre-auth: Got response:', {
                status: response.status,
                statusText: response.statusText,
                isError: response.isError
            });
            
            if (response.isError || response.status >= 400) {
                throw new Error(`Authentication request failed with status ${response.status}`);
            }
            
            // Extract auth token from response using JSON path
            const authToken = this.extractValueFromJsonPath(response.data, preAuth.responsePath);
            
            if (!authToken) {
                throw new Error(`Could not extract value from path: ${preAuth.responsePath}`);
            }
            
            // Send success response
            this.panel.webview.postMessage({
                command: 'preAuthComplete',
                success: true,
                authToken: authToken
            });
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            this.panel.webview.postMessage({
                command: 'preAuthComplete',
                success: false,
                error: errorMessage
            });
        }
    }

    /**
     * Extracts value from JSON object using dot notation path
     */
    private extractValueFromJsonPath(data: any, path: string): string | null {
        if (!path || !data) {
            return null;
        }
        
        const parts = path.split('.');
        let current = data;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return null;
            }
        }
        
        return current !== null && current !== undefined ? String(current) : null;
    }

    /**
     * Releases resources
     */
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}
