import { HttpRequest } from '../types';

/**
 * Утилита для экспорта HTTP запросов в формат cURL
 */
export class CurlExporter {
    /**
     * Конвертирует HTTP запрос в cURL команду
     */
    public export(request: HttpRequest): string {
        const parts: string[] = ['curl'];

        // Метод
        if (request.method !== 'GET') {
            parts.push(`-X ${request.method}`);
        }

        // URL (в кавычках для безопасности)
        parts.push(`'${request.url}'`);

        // Заголовки
        for (const [key, value] of Object.entries(request.headers)) {
            if (key && value) {
                parts.push(`-H '${key}: ${value}'`);
            }
        }

        // Тело запроса
        if (request.body && request.body.trim()) {
            // Экранируем одинарные кавычки в теле запроса
            const escapedBody = request.body.replace(/'/g, "'\\''");
            parts.push(`-d '${escapedBody}'`);
        }

        // Форматируем с переносами строк для читаемости
        return parts.join(' \\\n  ');
    }

    /**
     * Converts HTTP request to cURL command for Windows (PowerShell)
     */
    public exportForWindows(request: HttpRequest): string {
        const parts: string[] = ['curl'];

        // Method
        if (request.method !== 'GET') {
            parts.push(`-X ${request.method}`);
        }

        // URL (in double quotes for Windows)
        const url = `"${request.url}"`;
        parts.push(url);

        // Headers
        for (const [key, value] of Object.entries(request.headers)) {
            if (key && value) {
                // Escape double quotes
                const escapedValue = value.replace(/"/g, '\\"');
                const header = `-H "${key}: ${escapedValue}"`;
                parts.push(header);
            }
        }

        // Request body
        if (request.body && request.body.trim()) {
            // Escape double quotes and backslashes
            const escapedBody = request.body
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '');
            const data = `-d "${escapedBody}"`;
            parts.push(data);
        }

        // Format with backtick for PowerShell
        return parts.join(' `\n  ');
    }
}
