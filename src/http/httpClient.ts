import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import https from 'https';
import http from 'http';
import { HttpRequest, HttpResponse } from '../types';

/**
 * HTTP client for sending requests
 */
export class HttpClient {
    private readonly timeout: number;

    constructor(timeout: number = 30000) {
        this.timeout = timeout;
    }

    /**
     * Sends HTTP request
     */
    public async send(request: HttpRequest): Promise<HttpResponse> {
        const startTime = Date.now();

        try {
            const config = this.buildAxiosConfig(request);
            const response = await axios(config);
            const duration = Date.now() - startTime;

            return this.buildSuccessResponse(response, duration);
        } catch (error) {
            const duration = Date.now() - startTime;
            return this.buildErrorResponse(error as AxiosError, duration);
        }
    }

    /**
     * Builds axios configuration
     */
    private buildAxiosConfig(request: HttpRequest): AxiosRequestConfig {
        const config: AxiosRequestConfig = {
            method: request.method.toLowerCase(),
            url: request.url,
            headers: request.headers || {},
            timeout: this.timeout,
            // Disable SSL certificate verification to avoid proxy certificate issues
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
                keepAlive: true
            }),
            httpAgent: new http.Agent({
                keepAlive: true
            }),
            // Additional settings to handle proxy issues
            maxRedirects: 5
        };

        // Add request body for methods that support it
        if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
            config.data = this.parseRequestBody(request.body, request.bodyType);
        }

        return config;
    }

    /**
     * Parses request body depending on type
     */
    private parseRequestBody(body: string, bodyType?: string): any {
        if (!bodyType || bodyType === 'json') {
            try {
                // Try to parse as JSON
                return JSON.parse(body);
            } catch {
                // If not JSON, return as is
                return body;
            }
        }

        if (bodyType === 'urlencoded') {
            // For URL encoded data return as is
            // axios will handle it automatically if Content-Type is set
            return body;
        }

        // For all other types (text, xml, html, javascript) return as string
        return body;
    }

    /**
     * Builds success response
     */
    private buildSuccessResponse(response: AxiosResponse, duration: number): HttpResponse {
        return {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as Record<string, string>,
            data: response.data,
            duration,
            isError: false
        };
    }

    /**
     * Builds error response
     */
    private buildErrorResponse(error: AxiosError, duration: number): HttpResponse {
        return {
            status: error.response?.status || 0,
            statusText: error.response?.statusText || error.message,
            headers: (error.response?.headers as Record<string, string>) || {},
            data: error.response?.data || { error: error.message },
            duration,
            isError: true
        };
    }
}
