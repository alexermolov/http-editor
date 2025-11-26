import { HttpRequest, HttpMethod } from "../types";

/**
 * Postman Collection interfaces
 */
interface PostmanRequest {
  name?: string;
  request?: {
    method?: string;
    url?:
      | string
      | {
          raw?: string;
          protocol?: string;
          host?: string[];
          path?: string[];
          query?: Array<{ key: string; value: string; disabled?: boolean }>;
        };
    header?: Array<{ key: string; value: string; disabled?: boolean }>;
    body?: {
      mode?: string;
      raw?: string;
      urlencoded?: Array<{ key: string; value: string; disabled?: boolean }>;
    };
  };
}

interface PostmanItem {
  name?: string;
  request?: any;
  item?: PostmanItem[];
}

interface PostmanCollection {
  info?: {
    name?: string;
  };
  item?: PostmanItem[];
}

/**
 * Import parser for Postman collections and cURL commands
 */
export class ImportParser {
  private requestCounter = 0;

  /**
   * Parse import content (auto-detect format)
   */
  public parse(content: string): HttpRequest[] {
    this.requestCounter = 0;
    const trimmed = content.trim();

    // Try to detect format
    if (trimmed.startsWith("{")) {
      // Likely JSON (Postman collection)
      try {
        const json = JSON.parse(trimmed);
        return this.parsePostmanCollection(json);
      } catch (e) {
        throw new Error("Invalid JSON format");
      }
    } else if (trimmed.toLowerCase().startsWith("curl")) {
      // cURL command
      return [this.parseCurl(trimmed)];
    } else {
      throw new Error(
        "Unsupported format. Please provide a Postman collection (JSON) or cURL command."
      );
    }
  }

  /**
   * Parse Postman collection
   */
  public parsePostmanCollection(collection: PostmanCollection): HttpRequest[] {
    const requests: HttpRequest[] = [];

    if (collection.item) {
      this.extractRequestsFromItems(collection.item, requests);
    }

    return requests;
  }

  /**
   * Recursively extract requests from Postman items (folders and requests)
   */
  private extractRequestsFromItems(
    items: PostmanItem[],
    requests: HttpRequest[],
    prefix: string = ""
  ): void {
    for (const item of items) {
      if (item.item) {
        // It's a folder
        const folderName = item.name || "Folder";
        this.extractRequestsFromItems(
          item.item,
          requests,
          prefix ? `${prefix} / ${folderName}` : folderName
        );
      } else if (item.request) {
        // It's a request
        const request = this.parsePostmanRequest(item, prefix);
        requests.push(request);
      }
    }
  }

  /**
   * Parse single Postman request
   */
  private parsePostmanRequest(
    item: PostmanItem,
    prefix: string = ""
  ): HttpRequest {
    const req = item.request || {};
    const name = prefix
      ? `${prefix} / ${item.name || "Request"}`
      : item.name || "Imported Request";

    // Parse method
    const method = (req.method || "GET").toUpperCase() as HttpMethod;

    // Parse URL
    let url = "";
    if (typeof req.url === "string") {
      url = req.url;
    } else if (req.url && typeof req.url === "object") {
      url = req.url.raw || this.constructUrlFromObject(req.url);
    }

    // Parse headers
    const headers: Record<string, string> = {};
    if (req.header && Array.isArray(req.header)) {
      for (const h of req.header) {
        if (h.key && h.value && !h.disabled) {
          headers[h.key] = h.value;
        }
      }
    }

    // Parse body
    let body = "";
    let bodyType:
      | "json"
      | "text"
      | "urlencoded"
      | "xml"
      | "html"
      | "javascript" = "text";

    if (req.body) {
      if (req.body.mode === "raw" && req.body.raw) {
        body = req.body.raw;
        // Try to detect body type
        bodyType = this.detectBodyType(
          body,
          headers["Content-Type"] || headers["content-type"]
        );
      } else if (req.body.mode === "urlencoded" && req.body.urlencoded) {
        const params = req.body.urlencoded
          .filter((p: any) => !p.disabled)
          .map(
            (p: any) =>
              `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
          )
          .join("&");
        body = params;
        bodyType = "urlencoded";
      }
    }

    return {
      id: `${Date.now()}-${++this.requestCounter}`,
      name,
      method,
      url,
      headers,
      body,
      bodyType,
    };
  }

  /**
   * Construct URL from Postman URL object
   */
  private constructUrlFromObject(urlObj: any): string {
    let url = "";

    if (urlObj.protocol) {
      url += `${urlObj.protocol}://`;
    }

    if (urlObj.host) {
      url += Array.isArray(urlObj.host) ? urlObj.host.join(".") : urlObj.host;
    }

    // Add port if present
    if (urlObj.port) {
      url += `:${urlObj.port}`;
    }

    if (urlObj.path) {
      const path = Array.isArray(urlObj.path)
        ? urlObj.path.join("/")
        : urlObj.path;
      url += `/${path}`;
    }

    if (
      urlObj.query &&
      Array.isArray(urlObj.query) &&
      urlObj.query.length > 0
    ) {
      const queryParams = urlObj.query
        .filter((q: any) => !q.disabled)
        .map(
          (q: any) =>
            `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value || "")}`
        )
        .join("&");
      if (queryParams) {
        url += `?${queryParams}`;
      }
    }

    return url;
  }

  /**
   * Parse cURL command
   */
  public parseCurl(curlCommand: string): HttpRequest {
    const request: HttpRequest = {
      id: `${Date.now()}-${++this.requestCounter}`,
      name: "Imported from cURL",
      method: "GET",
      url: "",
      headers: {},
      body: "",
      bodyType: "text",
    };

    // Remove curl prefix, collapse line continuations, and normalize whitespace
    let cmd = curlCommand
      .trim()
      .replace(/^curl\s+/i, "")
      .replace(/\\\s*\n/g, " ");

    // Extract method first
    const methodMatch = cmd.match(/(?:-X|--request)\s+([A-Z]+)/i);
    if (methodMatch) {
      request.method = methodMatch[1].toUpperCase() as HttpMethod;
    }

    // Extract URL (match http/https URL, but skip if it's part of a method flag)
    // First try to find URL after method flag, then look for standalone URL
    const urlMatch =
      cmd.match(/(?:-X|--request)\s+[A-Z]+\s+['""]?(https?:\/\/[^\s'"]+)/i) ||
      cmd.match(/(?:^|\s)(?!-)['""]?(https?:\/\/[^\s'"]+)/i) ||
      cmd.match(/(?:-L|--location)\s+['""]?([^'""]+)/i);
    if (urlMatch) {
      request.url = urlMatch[1].replace(/['"]/g, "");
    }

    // Extract headers
    const headerRegex = /(?:-H|--header)\s+['"](.*?)['"]/gi;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cmd)) !== null) {
      const headerLine = headerMatch[1];
      const colonIndex = headerLine.indexOf(":");
      if (colonIndex > 0) {
        const key = headerLine.substring(0, colonIndex).trim();
        let value = headerLine.substring(colonIndex + 1).trim();
        // Remove surrounding quotes from value if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        // Skip empty quoted values like ""
        if (value !== "") {
          request.headers[key] = value;
        }
      }
    }

    // Extract body data (supports multiple -d/--data* occurrences including --data-urlencode)
    const dataRegex =
      /((?:-d|--data(?:-raw|-binary|-urlencode)?))\s+(?:'([\s\S]*?)'|"([\s\S]*?)"|([^\s"']+))/gi;
    const dataSegments: Array<{ flag: string; value: string }> = [];
    let dataMatch;
    while ((dataMatch = dataRegex.exec(cmd)) !== null) {
      const flag = dataMatch[1].toLowerCase();
      const value = dataMatch[2] ?? dataMatch[3] ?? dataMatch[4] ?? "";
      dataSegments.push({ flag, value });
    }

    if (dataSegments.length > 0) {
      const isUrlEncoded =
        dataSegments.some((segment) => segment.flag === "--data-urlencode") ||
        this.isUrlEncodedFromHeaders(request.headers);
      const parts = dataSegments.map((segment) =>
        this.normalizeCurlDataValue(segment.value, segment.flag, isUrlEncoded)
      );
      request.body = isUrlEncoded ? parts.join("&") : parts.join("\n");
      request.bodyType = this.detectBodyType(
        request.body,
        request.headers["Content-Type"] || request.headers["content-type"]
      );
    }

    return request;
  }

  private isUrlEncodedFromHeaders(headers: Record<string, string>): boolean {
    const contentType = headers["Content-Type"] || headers["content-type"];
    return Boolean(
      contentType &&
        contentType.toLowerCase().includes("application/x-www-form-urlencoded")
    );
  }

  private normalizeCurlDataValue(
    value: string,
    flag: string,
    fallbackUrlEncoded: boolean
  ): string {
    if (flag === "--data-urlencode") {
      const trimmed = value.trim();
      if (trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const rawVal = rest.join("=");
        return `${encodeURIComponent(key)}=${this.encodePreservingPlaceholders(
          rawVal
        )}`;
      }
      return this.encodePreservingPlaceholders(trimmed);
    }

    if (fallbackUrlEncoded) {
      // Preserve raw key/value pairs when the header enforces URL-encoded bodies
      return value.trim();
    }

    return value;
  }

  private encodePreservingPlaceholders(value: string): string {
    const tokenRegex = /{{[^{}]+}}/g;
    let lastIndex = 0;
    let result = "";
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(value)) !== null) {
      const before = value.slice(lastIndex, match.index);
      if (before) {
        result += encodeURIComponent(before);
      }
      result += match[0];
      lastIndex = match.index + match[0].length;
    }

    const remaining = value.slice(lastIndex);
    if (remaining) {
      result += encodeURIComponent(remaining);
    }

    return result;
  }

  /**
   * Detect body type from content and Content-Type header
   */
  private detectBodyType(
    body: string,
    contentType?: string
  ): "json" | "text" | "urlencoded" | "xml" | "html" | "javascript" {
    if (contentType) {
      const ct = contentType.toLowerCase();
      if (ct.includes("application/json")) return "json";
      if (ct.includes("application/x-www-form-urlencoded")) return "urlencoded";
      if (ct.includes("xml")) return "xml";
      if (ct.includes("html")) return "html";
      if (ct.includes("javascript")) return "javascript";
    }

    // Try to detect from content
    const trimmed = body.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        JSON.parse(trimmed);
        return "json";
      } catch {
        // Not valid JSON
      }
    }

    if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
      return "xml";
    }

    if (trimmed.includes("=") && trimmed.includes("&")) {
      return "urlencoded";
    }

    return "text";
  }
}
