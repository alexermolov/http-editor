/**
 * Interface for query parameter
 */
export interface QueryParam {
    key: string;
    value: string;
    enabled: boolean;
}

/**
 * Interface for variable
 */
export interface Variable {
    name: string;
    value: string;
}

/**
 * Pre-authentication configuration
 */
export interface PreAuthConfig {
    enabled: boolean;
    curlCommand: string;
    responsePath: string;
    username?: string;
    password?: string;
}

/**
 * Interface for HTTP request
 */
export interface HttpRequest {
    id: number | string;
    name: string;
    method: HttpMethod;
    url: string;
    headers: Record<string, string>;
    queryParams?: QueryParam[];
    body: string;
    bodyType?: BodyType;
    variables?: Record<string, string>;
    preAuth?: PreAuthConfig;
    isPreAuthRequest?: boolean;
}

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Request body types
 */
export type BodyType = 'json' | 'text' | 'urlencoded' | 'xml' | 'html' | 'javascript';

/**
 * Interface for HTTP response
 */
export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    duration: number;
    isError?: boolean;
}

/**
 * Message types between WebView and extension
 */
export interface Message {
    command: string;
    [key: string]: any;
}

export interface SendRequestMessage extends Message {
    command: 'sendRequest';
    request: HttpRequest;
}

export interface SaveRequestsMessage extends Message {
    command: 'saveRequests';
    requests: HttpRequest[];
    preAuth?: PreAuthConfig;
}

export interface RequestCompleteMessage extends Message {
    command: 'requestComplete';
    response: HttpResponse;
}

export interface LogMessage extends Message {
    command: 'log';
    text: string;
}

export interface ExportToCurlMessage extends Message {
    command: 'exportToCurl';
    request: HttpRequest;
}

export interface ImportRequestsMessage extends Message {
    command: 'importRequests';
    content: string;
}

export interface ExecutePreAuthMessage extends Message {
    command: 'executePreAuth';
    preAuth: PreAuthConfig;
    variables?: Record<string, string>;
    requestId: number | string;
}

/**
 * Environment configuration
 */
export interface Environment {
    name: string;
    variables: Record<string, string>;
}

/**
 * User profile for testing with multiple accounts
 */
export interface UserProfile {
    name: string;
    username?: string;
    password?: string;
    token?: string;
    variables?: Record<string, string>;
}

/**
 * Locale and timezone settings
 */
export interface LocaleSettings {
    locale: string;
    timezone: string;
}

/**
 * Extension configuration
 */
export interface ExtensionConfig {
    environments: Environment[];
    users: UserProfile[];
    locales: LocaleSettings[];
    defaultEnvironment?: string;
    defaultUser?: string;
    defaultLocale?: string;
}

/**
 * Message for changing environment
 */
export interface ChangeEnvironmentMessage extends Message {
    command: 'changeEnvironment';
    environment: string;
}

/**
 * Message for changing user profile
 */
export interface ChangeUserMessage extends Message {
    command: 'changeUser';
    user: string;
}

/**
 * Message for changing locale settings
 */
export interface ChangeLocaleMessage extends Message {
    command: 'changeLocale';
    locale: string;
    timezone: string;
}
