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

          // Check for @PRE-AUTH marker
          const isPreAuth = commentText === "@PRE-AUTH";
          
          // Начинаем новый запрос
          currentRequest = {
            id: Date.now() + Math.random(),
            name:
              commentText ||
              (pendingComments.length > 0
                ? pendingComments.join(" ")
                : ""), // Will be set later based on URL
            method: "GET",
            url: "",
            headers: {},
            body: "",
            variables: {},
          };
          
          // Mark as pre-auth request if applicable
          if (isPreAuth) {
            currentRequest.preAuth = {
              enabled: true,
              curlCommand: "",
              responsePath: "",
            };
            currentRequest.isPreAuthRequest = true;
          }
          
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
                : "", // Will be set later based on URL
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
          // Set name from URL if not already set
          if (!currentRequest.name) {
            currentRequest.name = this.extractRouteFromUrl(url, method) || url;
          }
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

    // Extract and write global variables
    // Collect all unique variables from all requests
    const allVariables: Record<string, string> = {};
    for (const req of requests) {
      if (req.variables) {
        Object.assign(allVariables, req.variables);
      }
    }

    // Write variables at the beginning of the file
    if (Object.keys(allVariables).length > 0) {
      for (const [name, value] of Object.entries(allVariables)) {
        content += `@${name} = ${value}\n`;
      }
      content += "\n";
    }

    // Write requests
    for (const req of requests) {
      // Request name (use @PRE-AUTH marker if it's a pre-auth request)
      if (req.preAuth?.enabled) {
        content += `### @PRE-AUTH\n`;
      } else {
        content += `### ${req.name}\n`;
      }

      // Method and URL
      content += `${req.method} ${req.url}\n`;

      // Headers
      for (const [key, value] of Object.entries(req.headers)) {
        if (key && value) {
          content += `${key}: ${value}\n`;
        }
      }

      // Request body
      let bodyContent = req.body || "";
      if (
        req.isPreAuthRequest ||
        req.name?.trim().toUpperCase() === "@PRE-AUTH"
      ) {
        bodyContent = this.sanitizePreAuthBody(bodyContent);
      }

      if (bodyContent.trim()) {
        content += `\n${bodyContent}\n`;
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
    let value = line.substring(equalIndex + 1).trim();
    
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    return { name, value };
  }

  /**
   * Extracts route/path from URL for request name
   */
  private extractRouteFromUrl(url: string, method?: string): string {
    if (!url) {
      return "";
    }
    
    let route = "";
    try {
      // Handle URLs with variables like {{baseUrl}}/endpoint
      if (url.includes("{{")) {
        // Just return the URL as-is if it contains variables
        route = url;
      } else {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        route = path || url;
      }
    } catch {
      // If URL parsing fails, return the whole URL
      route = url;
    }
    
    // Prepend method if provided
    if (method) {
      return `${method} ${route}`;
    }
    
    return route;
  }

  /**
   * Finalizes request creation, filling missing fields
   */
  private finalizeRequest(
    request: Partial<HttpRequest>,
    globalVariables: Record<string, string>
  ): HttpRequest {
    // Use URL route as name if name is empty
    let finalName = request.name || "";
    if (!finalName && request.url) {
      const method = request.method || "GET";
      finalName = this.extractRouteFromUrl(request.url, method) || request.url;
    }
    if (!finalName) {
      finalName = "Unnamed Request";
    }
    
    return {
      id: request.id || Date.now(),
      name: finalName,
      method: request.method || "GET",
      url: request.url || "",
      headers: request.headers || {},
      body: request.body || "",
      bodyType: request.bodyType || "text",
      variables: globalVariables,
      preAuth: request.preAuth,
      isPreAuthRequest: Boolean(request.isPreAuthRequest),
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
   * Removes credential values from pre-auth request bodies before saving to disk
   */
  private sanitizePreAuthBody(body: string): string {
    if (!body) {
      return body;
    }

    const credentialKeys = [
      "email",
      "login",
      "username",
      "user",
      "password",
      "pass",
    ];
    let sanitized = body;

    for (const key of credentialKeys) {
      const doubleQuoted = new RegExp(`("${key}"\s*:\s*")([^\"]*)(")`, "gi");
      sanitized = sanitized.replace(
        doubleQuoted,
        (_match, prefix, _value, suffix) => `${prefix}${suffix}`
      );

      const singleQuoted = new RegExp(`('${key}'\s*:\s*')([^']*)(')`, "gi");
      sanitized = sanitized.replace(
        singleQuoted,
        (_match, prefix, _value, suffix) => `${prefix}${suffix}`
      );
    }

    const formPattern = new RegExp(
      `\\b(${credentialKeys.join("|")})=([^&\\r\\n]*)`,
      "gi"
    );
    sanitized = sanitized.replace(formPattern, (_match, key) => `${key}=`);

    return sanitized;
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
