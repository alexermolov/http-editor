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
