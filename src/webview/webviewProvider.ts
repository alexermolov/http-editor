import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HttpRequest, Message, SendRequestMessage, SaveRequestsMessage, ExportToCurlMessage, ImportRequestsMessage, ExecutePreAuthMessage, ChangeEnvironmentMessage, ChangeUserMessage, ChangeLocaleMessage, ExtensionConfig, UserProfile } from '../types';
import { HttpFileParser } from '../parser/httpParser';
import { HttpClient } from '../http/httpClient';
import { WebviewContentGenerator } from './webviewContent';
import { CurlExporter } from '../utils/curlExporter';
import { ImportParser } from '../utils/importParser';
import { ConfigManager } from '../config/configManager';
import { logger } from '../utils/logger';

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
    private readonly configManager: ConfigManager;
    private fileUri: vscode.Uri | undefined;
    private selectedEnvironment: string = '';
    private selectedUser: string = '';
    private selectedLocale: string = '';
    private selectedTimezone: string = '';

    constructor(private readonly context: vscode.ExtensionContext) {
        this.parser = new HttpFileParser();
        this.httpClient = new HttpClient();
        this.contentGenerator = new WebviewContentGenerator();
        this.curlExporter = new CurlExporter();
        this.importParser = new ImportParser();
        this.configManager = new ConfigManager();
    }

    /**
     * Opens editor for specified file
     */
    public async openEditor(uri: vscode.Uri): Promise<void> {
        try {
            logger.debug('Opening editor for', uri.fsPath);
            
            // Check file extension
            if (!uri.fsPath.endsWith('.http')) {
                vscode.window.showErrorMessage('Please select a .http file');
                return;
            }

            this.fileUri = uri;

            // Создаем или показываем WebView панель
            if (this.panel) {
                logger.debug('Revealing existing panel');
                this.panel.reveal(vscode.ViewColumn.One);
            } else {
                logger.debug('Creating new panel');
                this.createWebviewPanel(uri);
            }

            // Загружаем и отображаем содержимое
            logger.debug('Loading content');
            await this.loadAndDisplayContent(uri);
            logger.debug('Editor opened successfully');
        } catch (error) {
            logger.error('Error in openEditor', error);
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
                localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
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
            // Load config
            const config = await this.configManager.load();

            // Initialize selections
            this.selectedEnvironment = '';
            this.selectedUser = '';
            this.selectedLocale = '';
            this.selectedTimezone = '';

            if (config.defaultLocale) {
                this.selectedLocale = config.defaultLocale;
                const localeObj = config.locales.find(l => l.locale === config.defaultLocale);
                if (localeObj) {
                    this.selectedTimezone = localeObj.timezone;
                }
            }

            // Read file content early to analyze variables
            const fileContent = fs.readFileSync(uri.fsPath, 'utf8');
            const fileVariables = this.parser.extractGlobalVariables(fileContent);

            // Detect matching environment and user based on variable overlap
            this.selectedEnvironment = this.detectEnvironmentFromFileVariables(fileVariables, config);
            this.selectedUser = this.detectUserFromFileVariables(fileVariables, config);

            // Get merged variables from config without falling back to defaults when no match
            const configVariables = this.configManager.getMergedVariables(
                this.selectedEnvironment,
                this.selectedUser,
                false
            );
            
            // Set external variables for parser
            this.parser.setExternalVariables(configVariables);

            // Parse requests
            const requests = this.parser.parse(fileContent);

            // Set locale and timezone for httpClient
            this.httpClient.setLocale(this.selectedLocale, this.selectedTimezone);

            // Override defaults shown in UI to reflect detected selections (or empty when no match)
            const effectiveConfig: ExtensionConfig = {
                ...config,
                defaultEnvironment: this.selectedEnvironment || undefined,
                defaultUser: this.selectedUser || undefined
            };

            const webview = this.panel.webview;
            const stylesUri = webview.asWebviewUri(
                vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.css')
            );
            const scriptUri = webview.asWebviewUri(
                vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.js')
            );

            // Generate and set HTML
            this.panel.webview.html = this.contentGenerator.generate(
                requests,
                uri.fsPath,
                effectiveConfig,
                {
                    stylesUri: stylesUri.toString(),
                    scriptUri: scriptUri.toString(),
                    cspSource: webview.cspSource
                }
            );
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
            case 'changeEnvironment':
                await this.handleChangeEnvironment(message as ChangeEnvironmentMessage);
                break;
            case 'changeUser':
                await this.handleChangeUser(message as ChangeUserMessage);
                break;
            case 'changeLocale':
                await this.handleChangeLocale(message as ChangeLocaleMessage);
                break;
            case 'log':
                logger.debug('[WebView]', message.text);
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
            const requestsToSave = this.prepareRequestsForSave(message);
            this.ensureCredentialVariables(requestsToSave);
            const content = this.parser.serialize(requestsToSave);
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

    private prepareRequestsForSave(message: SaveRequestsMessage): HttpRequest[] {
        const nonPreAuthRequests = message.requests.filter(req => {
            const name = req.name ? req.name.trim().toUpperCase() : '';
            return !req.isPreAuthRequest && name !== '@PRE-AUTH';
        });

        const preAuthConfig = message.preAuth;
        if (preAuthConfig?.enabled && preAuthConfig.curlCommand?.trim()) {
            try {
                const parsedPreAuth = this.importParser.parseCurl(preAuthConfig.curlCommand.trim());
                parsedPreAuth.name = '@PRE-AUTH';
                parsedPreAuth.isPreAuthRequest = true;
                parsedPreAuth.preAuth = {
                    enabled: true,
                    curlCommand: '',
                    responsePath: preAuthConfig.responsePath?.trim() || ''
                };
                nonPreAuthRequests.unshift(parsedPreAuth);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to parse pre-auth cURL command: ${errorMessage}`);
            }
        }

        return nonPreAuthRequests;
    }

    private ensureCredentialVariables(requests: HttpRequest[]): void {
        if (!requests.length) {
            return;
        }

        const aggregatedVariables: Record<string, string> = {};
        for (const req of requests) {
            if (!req.variables) {
                continue;
            }
            for (const [name, value] of Object.entries(req.variables)) {
                if (!(name in aggregatedVariables)) {
                    aggregatedVariables[name] = value;
                }
            }
        }

        let hasChanges = false;
        for (const variableName of ['username', 'password']) {
            if (!(variableName in aggregatedVariables)) {
                aggregatedVariables[variableName] = '';
                hasChanges = true;
            }
        }

        if (!hasChanges) {
            return;
        }

        for (const req of requests) {
            req.variables = {
                ...aggregatedVariables,
                ...(req.variables || {})
            };
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
            
            logger.debug('Pre-auth: Starting with config:', {
                hasCurlCommand: !!preAuth.curlCommand,
                hasUsername: !!preAuth.username,
                hasPassword: !!preAuth.password,
                responsePath: preAuth.responsePath,
                variables: message.variables
            });
            
            // Parse the cURL command
            let curlCommand = preAuth.curlCommand;
            
            // Replace username and password placeholders FIRST
            // Use form fields first, fallback to variables 'username' and 'password'
            const usernameVar = message.variables?.['username'];
            const passwordVar = message.variables?.['password'];
            const username = preAuth.username || (usernameVar && usernameVar.trim() ? usernameVar : '');
            const password = preAuth.password || (passwordVar && passwordVar.trim() ? passwordVar : '');
            
            // Sanitize credentials to prevent command injection
            const sanitizedUsername = this.sanitizeShellValue(username);
            const sanitizedPassword = this.sanitizeShellValue(password);
            
            if (sanitizedUsername) {
                curlCommand = curlCommand.replace(/\{\{username\}\}/g, sanitizedUsername);
            }
            if (sanitizedPassword) {
                curlCommand = curlCommand.replace(/\{\{password\}\}/g, sanitizedPassword);
            }
            
            // Replace OTHER variables from request context (excluding username and password)
            if (message.variables) {
                Object.entries(message.variables).forEach(([name, value]) => {
                    // Skip username and password as they are already processed
                    if (name === 'username' || name === 'password') {
                        return;
                    }
                    // Only replace if value is not empty
                    if (value && value.trim()) {
                        const sanitizedValue = this.sanitizeShellValue(value);
                        const pattern = new RegExp(`\\{\\{\\s*${this.escapeRegex(name)}\\s*\\}\\}`, 'g');
                        curlCommand = curlCommand.replace(pattern, sanitizedValue);
                    }
                });
            }
            
            logger.debug('Pre-auth: Final cURL command after variable substitution:', curlCommand);
            
            // Parse cURL to HttpRequest
            const authRequest = this.importParser.parseCurl(curlCommand);
            
            logger.debug('Pre-auth: Parsed auth request:', {
                method: authRequest.method,
                url: authRequest.url,
                headers: authRequest.headers,
                hasBody: !!authRequest.body,
                body: authRequest.body,
                bodyType: authRequest.bodyType
            });
            
            logger.debug('Pre-auth: Full auth request details:', JSON.stringify(authRequest, null, 2));
            
            // Execute the auth request
            const response = await this.httpClient.send(authRequest);
            
            logger.debug('Pre-auth: Got response:', {
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
     * Sanitizes shell values to prevent command injection
     */
    private sanitizeShellValue(value: string): string {
        if (!value) return '';
        
        // Remove or escape potentially dangerous characters
        // Allow only alphanumeric, common symbols, and escape special shell characters
        return value
            .replace(/[`$(){}[\]|&;<>\n\r]/g, '') // Remove dangerous shell characters
            .replace(/\\/g, '\\\\') // Escape backslashes
            .replace(/"/g, '\\"') // Escape double quotes
            .replace(/'/g, "'\\\''"); // Escape single quotes for shell
    }
    
    /**
     * Escapes special regex characters in a string
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
     * Handles environment change
     */
    private async handleChangeEnvironment(message: ChangeEnvironmentMessage): Promise<void> {
        this.selectedEnvironment = message.environment;
        
        // Update parser with new variables
        const configVariables = this.configManager.getMergedVariables(
            this.selectedEnvironment,
            this.selectedUser,
            false
        );
        this.parser.setExternalVariables(configVariables);
        
        logger.debug(`Environment changed to: ${this.selectedEnvironment}`);
        
        // Send updated variables to webview
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateVariables',
                variables: configVariables
            });
        }
    }

    /**
     * Handles user change
     */
    private async handleChangeUser(message: ChangeUserMessage): Promise<void> {
        this.selectedUser = message.user;
        
        // Update parser with new variables
        const configVariables = this.configManager.getMergedVariables(
            this.selectedEnvironment,
            this.selectedUser,
            false
        );
        this.parser.setExternalVariables(configVariables);
        
        logger.debug(`User changed to: ${this.selectedUser}`);
        
        // Send updated variables to webview
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateVariables',
                variables: configVariables
            });
        }
    }

    /**
     * Handles locale change
     */
    private async handleChangeLocale(message: ChangeLocaleMessage): Promise<void> {
        this.selectedLocale = message.locale;
        this.selectedTimezone = message.timezone;
        
        // Update httpClient with new locale/timezone
        this.httpClient.setLocale(this.selectedLocale, this.selectedTimezone);
        
        logger.debug(`Locale changed to: ${this.selectedLocale}, Timezone: ${this.selectedTimezone}`);
        
        // Send updated variables to webview (for consistency, in case locale affects variables)
        if (this.panel) {
            const configVariables = this.configManager.getMergedVariables(
                this.selectedEnvironment,
                this.selectedUser,
                false
            );
            this.panel.webview.postMessage({
                command: 'updateVariables',
                variables: configVariables
            });
        }
    }

    /**
     * Releases resources
     */
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }

    /**
     * Detects environment whose variables best match those declared in the .http file
     */
    private detectEnvironmentFromFileVariables(fileVariables: Record<string, string>, config: ExtensionConfig): string {
        if (!config.environments || config.environments.length === 0) {
            return '';
        }

        let bestMatch = '';
        let bestScore = 0;

        for (const env of config.environments) {
            const { matches, conflicts } = this.calculateMatchScore(env.variables, fileVariables);
            if (!conflicts && matches > 0 && matches > bestScore) {
                bestMatch = env.name;
                bestScore = matches;
            }
        }

        return bestMatch;
    }

    /**
     * Detects user profile whose variables best match those declared in the .http file
     */
    private detectUserFromFileVariables(fileVariables: Record<string, string>, config: ExtensionConfig): string {
        if (!config.users || config.users.length === 0) {
            return '';
        }

        let bestMatch = '';
        let bestScore = 0;

        for (const user of config.users) {
            const userVars = this.flattenUserVariables(user);
            const { matches, conflicts } = this.calculateMatchScore(userVars, fileVariables);
            if (!conflicts && matches > 0 && matches > bestScore) {
                bestMatch = user.name;
                bestScore = matches;
            }
        }

        return bestMatch;
    }

    /**
     * Calculates how many variables match exactly and whether any conflicts exist
     */
    private calculateMatchScore(target: Record<string, string>, fileVariables: Record<string, string>): { matches: number; conflicts: boolean } {
        let matches = 0;
        let conflicts = false;

        Object.entries(target || {}).forEach(([key, value]) => {
            if (!value) {
                return;
            }

            if (key in fileVariables) {
                if (fileVariables[key] === value) {
                    matches += 1;
                } else {
                    conflicts = true;
                }
            }
        });

        return { matches, conflicts };
    }

    /**
     * Normalizes user profile into a flat variable map for comparison
     */
    private flattenUserVariables(user: UserProfile): Record<string, string> {
        const vars: Record<string, string> = {};

        if (user.username) vars.username = user.username;
        if (user.password) vars.password = user.password;
        if (user.token) vars.token = user.token;
        if (user.variables) {
            Object.assign(vars, user.variables);
        }

        return vars;
    }
}
