import { HttpRequest, HttpMethod } from "../types";

/**
 * Parser for .http files
 */
export class HttpFileParser {
  /**
   * Parses .http file content and returns array of requests
   */
  public parse(content: string): HttpRequest[] {
    const requests: HttpRequest[] = [];
    const lines = content.split("\n");
    const globalVariables: Record<string, string> = {};
    let currentRequest: Partial<HttpRequest> | null = null;
    let inBody = false;
    let bodyLines: string[] = [];
    let pendingComments: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Пропускаем пустые строки, если нет текущего запроса
      if (!line && !currentRequest) {
        continue;
      }

      // Парсим переменные (формат: @name = value)
      if (line.startsWith("@") && line.includes("=")) {
        const { name, value } = this.parseVariable(line);
        if (name && value !== undefined) {
          globalVariables[name] = value;
        }
        continue;
      }

      // Парсим комментарии (строки начинающиеся с #)
      if (line.startsWith("#")) {
        // Извлекаем текст комментария, убирая все # в начале
        const commentText = line.replace(/^#+\s*/, "").trim();

        if (line.startsWith("###")) {
          // Разделитель запросов
          // Сохраняем предыдущий запрос, если он валидный
          if (currentRequest && currentRequest.url) {
            if (bodyLines.length > 0) {
              currentRequest.body = bodyLines.join("\n");
            }
            requests.push(
              this.finalizeRequest(currentRequest, globalVariables)
            );
          }

          // Начинаем новый запрос
          currentRequest = {
            id: Date.now() + Math.random(),
            name:
              commentText ||
              (pendingComments.length > 0
                ? pendingComments.join(" ")
                : `Request ${requests.length + 1}`),
            method: "GET",
            url: "",
            headers: {},
            body: "",
            variables: {},
          };
          inBody = false;
          bodyLines = [];
          pendingComments = [];
        } else {
          // Обычный комментарий (# или ##)
          if (currentRequest) {
            // Комментарий внутри запроса - игнорируем
            continue;
          } else {
            // Комментарий перед запросом - сохраняем
            if (commentText) {
              pendingComments.push(commentText);
            }
          }
        }
        continue;
      }

      // Method and URL - автоматически создаём запрос, если встретили метод без ###
      if (this.isMethodLine(line)) {
        // Если нет текущего запроса, создаём его автоматически
        if (!currentRequest) {
          currentRequest = {
            id: Date.now() + Math.random(),
            name:
              pendingComments.length > 0
                ? pendingComments.join(" ")
                : `Request ${requests.length + 1}`,
            method: "GET",
            url: "",
            headers: {},
            body: "",
            variables: {},
          };
          pendingComments = [];
        }

        // Парсим метод и URL, если они ещё не установлены
        if (!currentRequest.url) {
          const { method, url } = this.parseMethodLine(line);
          currentRequest.method = method;
          currentRequest.url = url;
        }
        continue;
      }

      if (!currentRequest) {
        continue;
      }

      // Headers
      if (
        line.includes(":") &&
        !inBody &&
        !line.startsWith("//") &&
        !line.startsWith("#")
      ) {
        const { key, value } = this.parseHeaderLine(line);
        if (key && value) {
          currentRequest.headers = currentRequest.headers || {};
          currentRequest.headers[key] = value;
        }
        continue;
      }

      // Empty line after headers means body starts
      if (line === "" && currentRequest.url && !inBody) {
        inBody = true;
        continue;
      }

      // Request body
      if (inBody) {
        bodyLines.push(lines[i]); // Keep original indentation
      }
    }

    // Save last request, если он валидный
    if (currentRequest && currentRequest.url) {
      if (bodyLines.length > 0) {
        currentRequest.body = bodyLines.join("\n");
      }
      // Detect body type
      currentRequest.bodyType = this.detectBodyType(currentRequest);
      requests.push(this.finalizeRequest(currentRequest, globalVariables));
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
    let content = "";

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
      }
      content += "\n";
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
      url: parts[1] || "",
    };
  }

  /**
   * Parses header line
   */
  private parseHeaderLine(line: string): { key: string; value: string } {
    const colonIndex = line.indexOf(":");
    return {
      key: line.substring(0, colonIndex).trim(),
      value: line.substring(colonIndex + 1).trim(),
    };
  }

  /**
   * Parses variable definition line
   */
  private parseVariable(line: string): { name: string; value: string } {
    const equalIndex = line.indexOf("=");
    const name = line.substring(1, equalIndex).trim(); // Remove @ prefix
    const value = line.substring(equalIndex + 1).trim();
    return { name, value };
  }

  /**
   * Finalizes request creation, filling missing fields
   */
  private finalizeRequest(
    request: Partial<HttpRequest>,
    globalVariables: Record<string, string>
  ): HttpRequest {
    return {
      id: request.id || Date.now(),
      name: request.name || "Unnamed Request",
      method: request.method || "GET",
      url: request.url || "",
      headers: request.headers || {},
      body: request.body || "",
      bodyType: request.bodyType || "text",
      variables: globalVariables,
    };
  }

  /**
   * Creates empty default request
   */
  private createEmptyRequest(): HttpRequest {
    return {
      id: Date.now(),
      name: "New Request",
      method: "GET",
      url: "https://api.example.com",
      headers: {},
      body: "",
      bodyType: "text",
    };
  }

  /**
   * Detects body type based on headers and content
   */
  private detectBodyType(
    request: Partial<HttpRequest>
  ): "json" | "text" | "urlencoded" | "xml" | "html" | "javascript" {
    const contentType =
      request.headers?.["Content-Type"]?.toLowerCase() ||
      request.headers?.["content-type"]?.toLowerCase() ||
      "";

    // Check Content-Type header
    if (contentType.includes("application/json")) {
      return "json";
    }
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return "urlencoded";
    }
    if (
      contentType.includes("application/xml") ||
      contentType.includes("text/xml")
    ) {
      return "xml";
    }
    if (contentType.includes("text/html")) {
      return "html";
    }
    if (
      contentType.includes("application/javascript") ||
      contentType.includes("text/javascript")
    ) {
      return "javascript";
    }

    // If no Content-Type, try to detect from content
    const body = request.body?.trim() || "";
    if (body) {
      if (body.startsWith("{") || body.startsWith("[")) {
        try {
          JSON.parse(body);
          return "json";
        } catch {
          // Not JSON
        }
      }
      if (body.startsWith("<?xml") || body.startsWith("<")) {
        return "xml";
      }
      if (body.includes("=") && body.includes("&")) {
        return "urlencoded";
      }
    }

    return "text";
  }
}
