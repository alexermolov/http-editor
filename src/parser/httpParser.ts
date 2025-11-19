import { HttpRequest, HttpMethod } from '../types';

/**
 * Parser for .http files
 */
export class HttpFileParser {
    /**
     * Parses .http file content and returns array of requests
     */
    public parse(content: string): HttpRequest[] {
        const requests: HttpRequest[] = [];
        const lines = content.split('\n');
        let currentRequest: Partial<HttpRequest> | null = null;
        let inBody = false;
        let bodyLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Разделитель запросов
            if (line.startsWith('###')) {
                // Сохраняем предыдущий запрос
                if (currentRequest) {
                    if (bodyLines.length > 0) {
                        currentRequest.body = bodyLines.join('\n');
                    }
                    requests.push(this.finalizeRequest(currentRequest));
                }

                // Начинаем новый запрос
                currentRequest = {
                    id: Date.now() + Math.random(),
                    name: line.substring(3).trim() || `Request ${requests.length + 1}`,
                    method: 'GET',
                    url: '',
                    headers: {},
                    body: ''
                };
                inBody = false;
                bodyLines = [];
                continue;
            }

            if (!currentRequest) {
                continue;
            }

            // Method and URL
            if (!currentRequest.url && this.isMethodLine(line)) {
                const { method, url } = this.parseMethodLine(line);
                currentRequest.method = method;
                currentRequest.url = url;
                continue;
            }

            // Headers
            if (line.includes(':') && !inBody) {
                const { key, value } = this.parseHeaderLine(line);
                if (key && value) {
                    currentRequest.headers = currentRequest.headers || {};
                    currentRequest.headers[key] = value;
                }
                continue;
            }

            // Empty line after headers means body starts
            if (line === '' && currentRequest.url && !inBody) {
                inBody = true;
                continue;
            }

            // Request body
            if (inBody) {
                bodyLines.push(lines[i]); // Keep original indentation
            }
        }

        // Save last request
        if (currentRequest) {
            if (bodyLines.length > 0) {
                currentRequest.body = bodyLines.join('\n');
            }
            // Detect body type
            currentRequest.bodyType = this.detectBodyType(currentRequest);
            requests.push(this.finalizeRequest(currentRequest));
        }

        // If no requests, create empty one
        if (requests.length === 0) {
            requests.push(this.createEmptyRequest());
        }

        return requests;
    }

    /**
     * Serializes requests back to .http file format
     */
    public serialize(requests: HttpRequest[]): string {
        let content = '';

        for (const req of requests) {
            // Request name
            content += `### ${req.name}\n`;
            
            // Method and URL
            content += `${req.method} ${req.url}\n`;
            
            // Headers
            for (const [key, value] of Object.entries(req.headers)) {
                if (key && value) {
                    content += `${key}: ${value}\n`;
                }
            }
            
            // Request body
            if (req.body && req.body.trim()) {
                content += `\n${req.body}\n`;
            }            content += '\n';
        }

        return content;
    }

    /**
     * Checks if line is a method line
     */
    private isMethodLine(line: string): boolean {
        return /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+/i.test(line);
    }

    /**
     * Parses method and URL line
     */
    private parseMethodLine(line: string): { method: HttpMethod; url: string } {
        const parts = line.split(/\s+/);
        return {
            method: parts[0].toUpperCase() as HttpMethod,
            url: parts[1] || ''
        };
    }

    /**
     * Parses header line
     */
    private parseHeaderLine(line: string): { key: string; value: string } {
        const colonIndex = line.indexOf(':');
        return {
            key: line.substring(0, colonIndex).trim(),
            value: line.substring(colonIndex + 1).trim()
        };
    }

    /**
     * Finalizes request creation, filling missing fields
     */
    private finalizeRequest(request: Partial<HttpRequest>): HttpRequest {
        return {
            id: request.id || Date.now(),
            name: request.name || 'Unnamed Request',
            method: request.method || 'GET',
            url: request.url || '',
            headers: request.headers || {},
            body: request.body || '',
            bodyType: request.bodyType || 'text'
        };
    }

    /**
     * Creates empty default request
     */
    private createEmptyRequest(): HttpRequest {
        return {
            id: Date.now(),
            name: 'New Request',
            method: 'GET',
            url: 'https://api.example.com',
            headers: {},
            body: '',
            bodyType: 'text'
        };
    }

    /**
     * Detects body type based on headers and content
     */
    private detectBodyType(request: Partial<HttpRequest>): 'json' | 'text' | 'urlencoded' | 'xml' | 'html' | 'javascript' {
        const contentType = request.headers?.['Content-Type']?.toLowerCase() || 
                           request.headers?.['content-type']?.toLowerCase() || '';

        // Check Content-Type header
        if (contentType.includes('application/json')) {
            return 'json';
        }
        if (contentType.includes('application/x-www-form-urlencoded')) {
            return 'urlencoded';
        }
        if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
            return 'xml';
        }
        if (contentType.includes('text/html')) {
            return 'html';
        }
        if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
            return 'javascript';
        }

        // If no Content-Type, try to detect from content
        const body = request.body?.trim() || '';
        if (body) {
            if (body.startsWith('{') || body.startsWith('[')) {
                try {
                    JSON.parse(body);
                    return 'json';
                } catch {
                    // Not JSON
                }
            }
            if (body.startsWith('<?xml') || body.startsWith('<')) {
                return 'xml';
            }
            if (body.includes('=') && body.includes('&')) {
                return 'urlencoded';
            }
        }

        return 'text';
    }
}
