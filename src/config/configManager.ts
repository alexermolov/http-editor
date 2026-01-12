import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionConfig, Environment, UserProfile, LocaleSettings } from '../types';
import { logger } from '../utils/logger';

/**
 * Configuration file name
 */
const CONFIG_FILE_NAME = '.http-editor.config.json';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ExtensionConfig = {
    environments: [
        {
            name: 'local',
            variables: {
                host: 'localhost:3000',
                protocol: 'http'
            }
        }
    ],
    users: [],
    locales: [
        {
            locale: 'en-US',
            timezone: 'America/New_York'
        }
    ],
    defaultEnvironment: 'local'
};

/**
 * Manages configuration file
 */
export class ConfigManager {
    private config: ExtensionConfig;
    private configFilePath: string | null = null;

    constructor() {
        this.config = DEFAULT_CONFIG;
    }

    /**
     * Loads configuration from workspace root
     */
    public async load(): Promise<ExtensionConfig> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                logger.debug('No workspace folder found, using default config');
                return this.config;
            }

            // Try to find config file in workspace root
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME);
            
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf8');
                this.config = JSON.parse(content);
                this.configFilePath = configPath;
                logger.info('Loaded config from:', configPath);
            } else {
                logger.debug('Config file not found, using default config');
                this.config = DEFAULT_CONFIG;
            }
        } catch (error) {
            logger.error('Failed to load config:', error);
            vscode.window.showWarningMessage('Failed to load configuration, using defaults');
            this.config = DEFAULT_CONFIG;
        }

        return this.config;
    }

    /**
     * Saves configuration to workspace root
     */
    public async save(config: ExtensionConfig): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME);
            
            const content = JSON.stringify(config, null, 2);
            fs.writeFileSync(configPath, content, 'utf8');
            
            this.config = config;
            this.configFilePath = configPath;
            
            logger.info('Saved config to:', configPath);
        } catch (error) {
            logger.error('Failed to save config:', error);
            throw error;
        }
    }

    /**
     * Gets current configuration
     */
    public getConfig(): ExtensionConfig {
        return this.config;
    }

    /**
     * Gets environment by name
     */
    public getEnvironment(name: string): Environment | undefined {
        return this.config.environments.find(env => env.name === name);
    }

    /**
     * Gets user profile by name
     */
    public getUser(name: string): UserProfile | undefined {
        return this.config.users.find(user => user.name === name);
    }

    /**
     * Gets locale settings by locale name
     */
    public getLocale(locale: string): LocaleSettings | undefined {
        return this.config.locales.find(l => l.locale === locale);
    }

    /**
     * Gets merged variables from environment and user
     */
    public getMergedVariables(environmentName?: string, userName?: string): Record<string, string> {
        const variables: Record<string, string> = {};

        // Add environment variables
        if (environmentName) {
            const environment = this.getEnvironment(environmentName);
            if (environment) {
                Object.assign(variables, environment.variables);
            }
        } else if (this.config.defaultEnvironment) {
            const environment = this.getEnvironment(this.config.defaultEnvironment);
            if (environment) {
                Object.assign(variables, environment.variables);
            }
        }

        // Add user variables (overrides environment variables)
        if (userName) {
            const user = this.getUser(userName);
            if (user) {
                if (user.username) variables.username = user.username;
                if (user.password) variables.password = user.password;
                if (user.token) variables.token = user.token;
                if (user.variables) {
                    Object.assign(variables, user.variables);
                }
            }
        } else if (this.config.defaultUser) {
            const user = this.getUser(this.config.defaultUser);
            if (user) {
                if (user.username) variables.username = user.username;
                if (user.password) variables.password = user.password;
                if (user.token) variables.token = user.token;
                if (user.variables) {
                    Object.assign(variables, user.variables);
                }
            }
        }

        return variables;
    }

    /**
     * Creates example config file in workspace
     */
    public async createExampleConfig(): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME);
            
            if (fs.existsSync(configPath)) {
                const answer = await vscode.window.showWarningMessage(
                    'Config file already exists. Overwrite?',
                    'Yes',
                    'No'
                );
                
                if (answer !== 'Yes') {
                    return;
                }
            }

            const exampleConfig: ExtensionConfig = {
                environments: [
                    {
                        name: 'local',
                        variables: {
                            host: 'localhost:3000',
                            protocol: 'http',
                            apiVersion: 'v1'
                        }
                    },
                    {
                        name: 'staging',
                        variables: {
                            host: 'staging.mydomain.com',
                            protocol: 'https',
                            apiVersion: 'v1'
                        }
                    },
                    {
                        name: 'production',
                        variables: {
                            host: 'api.mydomain.com',
                            protocol: 'https',
                            apiVersion: 'v1'
                        }
                    }
                ],
                users: [
                    {
                        name: 'admin',
                        username: 'admin@example.com',
                        password: 'admin123',
                        token: 'Bearer admin-token-here',
                        variables: {
                            userId: '1',
                            role: 'admin'
                        }
                    },
                    {
                        name: 'testUser',
                        username: 'test@example.com',
                        password: 'test123',
                        token: 'Bearer test-token-here',
                        variables: {
                            userId: '2',
                            role: 'user'
                        }
                    }
                ],
                locales: [
                    {
                        locale: 'en-US',
                        timezone: 'America/New_York'
                    },
                    {
                        locale: 'en-GB',
                        timezone: 'Europe/London'
                    },
                    {
                        locale: 'ja-JP',
                        timezone: 'Asia/Tokyo'
                    }
                ],
                defaultEnvironment: 'local',
                defaultUser: 'admin',
                defaultLocale: 'en-US'
            };

            const content = JSON.stringify(exampleConfig, null, 2);
            fs.writeFileSync(configPath, content, 'utf8');
            
            vscode.window.showInformationMessage('Example config file created successfully');
            
            // Open the file
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            logger.error('Failed to create example config:', error);
            vscode.window.showErrorMessage('Failed to create example config file');
        }
    }
}
