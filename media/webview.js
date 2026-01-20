/* Webview UI logic for HTTP Editor.
   This file is loaded by the webview HTML. */

const vscode = acquireVsCodeApi();

// Initial state is provided by the HTML as JSON (non-executed script tag).
const initialStateNode = document.getElementById("http-editor-initial-state");
let initialState = { requests: [], config: null };
try {
  if (initialStateNode && initialStateNode.textContent) {
    initialState = JSON.parse(initialStateNode.textContent);
  }
} catch {
  // Ignore invalid initial state
}

let requests = Array.isArray(initialState.requests)
  ? initialState.requests
  : [];
let currentRequestId = requests.length > 0 ? requests[0].id : null;
let lastResponse = null;
let sessionVariables = {};

// Configuration state
let config = null;
let selectedEnvironment = "";
let selectedUser = "";
let selectedLocale = "";
let selectedTimezone = "";

// Global pre-auth configuration (shared across all requests)
let globalPreAuthConfig = {
  enabled: false,
  curlCommand: "",
  responsePath: "",
  username: "",
  password: "",
};

hydrateGlobalPreAuthConfigFromRequests();

// Initialize
function init() {
  renderRequestList();
  if (currentRequestId) {
    selectRequest(currentRequestId);
  }

  const bodyInput = document.getElementById("bodyInput");
  if (bodyInput) {
    bodyInput.addEventListener("scroll", syncBodyScroll);
    bodyInput.addEventListener("input", function() {
      updateCurrentRequest();
      updateBodyHighlight();
    });
  }
}

// Initialize config UI
function initConfig(configData) {
  config = configData;

  if (
    !config ||
    ((!config.environments || config.environments.length === 0) &&
      (!config.users || config.users.length === 0) &&
      (!config.locales || config.locales.length === 0))
  ) {
    // Hide config selectors if no config
    document.getElementById("configSelectors").style.display = "none";
    return;
  }

  // Show config selectors
  document.getElementById("configSelectors").style.display = "block";

  // Populate environment selector
  const envSelect = document.getElementById("environmentSelect");
  envSelect.innerHTML = '<option value="">No Environment</option>';
  if (config.environments) {
    config.environments.forEach((env) => {
      const option = document.createElement("option");
      option.value = env.name;
      option.textContent = env.name;
      envSelect.appendChild(option);
    });
  }
  if (config.defaultEnvironment) {
    envSelect.value = config.defaultEnvironment;
    selectedEnvironment = config.defaultEnvironment;
  }

  // Populate user selector
  const userSelect = document.getElementById("userSelect");
  userSelect.innerHTML = '<option value="">No User</option>';
  if (config.users) {
    config.users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.name;
      option.textContent = user.name;
      userSelect.appendChild(option);
    });
  }
  if (config.defaultUser) {
    userSelect.value = config.defaultUser;
    selectedUser = config.defaultUser;
  }

  // Populate locale selector
  const localeSelect = document.getElementById("localeSelect");
  localeSelect.innerHTML = '<option value="">Default</option>';
  if (config.locales) {
    config.locales.forEach((locale) => {
      const option = document.createElement("option");
      option.value = locale.locale;
      option.textContent = `${locale.locale} (${locale.timezone})`;
      localeSelect.appendChild(option);
    });
  }
  if (config.defaultLocale) {
    localeSelect.value = config.defaultLocale;
    selectedLocale = config.defaultLocale;
    // Find timezone for default locale
    const localeObj = config.locales.find(
      (l) => l.locale === config.defaultLocale
    );
    if (localeObj) {
      selectedTimezone = localeObj.timezone;
    }
  }
}

// Change environment
function changeEnvironment(envName) {
  selectedEnvironment = envName;
  vscode.postMessage({
    command: "changeEnvironment",
    environment: envName,
  });
}

// Change user
function changeUser(userName) {
  selectedUser = userName;
  vscode.postMessage({
    command: "changeUser",
    user: userName,
  });
}

// Change locale
function changeLocale() {
  const localeSelect = document.getElementById("localeSelect");
  selectedLocale = localeSelect.value;

  // Find timezone for selected locale
  if (config && config.locales) {
    const localeObj = config.locales.find((l) => l.locale === selectedLocale);
    if (localeObj) {
      selectedTimezone = localeObj.timezone;
    }
  }

  vscode.postMessage({
    command: "changeLocale",
    locale: selectedLocale,
    timezone: selectedTimezone,
  });
}

// Render request list
function renderRequestList() {
  const list = document.getElementById("requestList");
  list.innerHTML = "";

  requests.forEach((req) => {
    const item = document.createElement("div");
    item.className =
      "request-item" + (req.id === currentRequestId ? " active" : "");
    item.innerHTML = `
                    <div class="request-info" onclick="selectRequest(${
                      req.id
                    })">
                        <div class="request-method method-${req.method}">${
      req.method
    }</div>
                        <div class="request-name">${escapeHtml(req.name)}</div>
                    </div>
                    <button class="btn-delete" onclick="deleteRequest(${
                      req.id
                    }); event.stopPropagation();">Delete</button>
                `;
    list.appendChild(item);
  });
}

// Select request
function selectRequest(id) {
  currentRequestId = id;
  const request = requests.find((r) => r.id === id);

  if (!request) return;

  // Update UI
  document.getElementById("requestName").value = request.name;
  document.getElementById("methodSelect").value = request.method;
  document.getElementById("bodyInput").value = request.body || "";
  document.getElementById("bodyTypeSelect").value = request.bodyType || "text";
  updateBodyHighlight();
  syncBodyScroll();

  // Initialize queryParams if not exists
  if (!request.queryParams) {
    request.queryParams = [];
  }

  // Build full URL with query params for display
  let displayUrl = request.url;
  if (request.queryParams && request.queryParams.length > 0) {
    const enabledParams = request.queryParams.filter((p) => p.enabled);
    if (enabledParams.length > 0) {
      const queryString = enabledParams
        .map(
          (p) =>
            `${smartEncodeURIComponent(p.key)}=${smartEncodeURIComponent(
              p.value
            )}`
        )
        .join("&");
      displayUrl = `${request.url}?${queryString}`;
    }
  }
  document.getElementById("urlInput").value = displayUrl;

  // Render query params
  renderQueryParams(request.queryParams);

  // Render headers
  renderHeaders(request.headers);

  // Render variables
  renderVariables(request.variables || {});
  updateVariableUsageIndicators();

  // Render pre-auth config from global state
  renderPreAuth(globalPreAuthConfig);

  // Auto-populate from @PRE-AUTH if enabled and fields are empty
  if (globalPreAuthConfig.enabled && !globalPreAuthConfig.curlCommand) {
    autoPopulateFromPreAuthRequest();
  }

  // Update list
  renderRequestList();

  // Reset response
  lastResponse = null;
  document.getElementById("responseContainer").innerHTML =
    '<div class="empty-state"><p>No response yet. Send a request to see the response.</p></div>';
}

function syncUrlPreviewScroll() {
  const urlInput = document.getElementById("urlInput");
  const urlPreview = document.getElementById("urlPreview");
  if (!urlInput || !urlPreview) return;

  // Mirror the horizontal scroll position so highlight backgrounds track the text.
  urlPreview.scrollLeft = urlInput.scrollLeft;
}

// Toggle pre-auth expand/collapse
function togglePreAuthExpand() {
  const content = document.getElementById("preAuthContent");
  const arrow = document.getElementById("preAuthArrow");
  const isExpanded = content.style.display === "block";

  content.style.display = isExpanded ? "none" : "block";
  arrow.classList.toggle("expanded", !isExpanded);
}

// Toggle pre-auth
function togglePreAuth() {
  const enabled = document.getElementById("preAuthEnabled").checked;
  const content = document.getElementById("preAuthContent");
  const arrow = document.getElementById("preAuthArrow");

  if (enabled) {
    content.style.display = "block";
    arrow.classList.add("expanded");

    // Try to auto-populate from @PRE-AUTH request
    autoPopulateFromPreAuthRequest();
    ensureAuthVariableEmpty();
  } else {
    content.style.display = "none";
    arrow.classList.remove("expanded");
  }

  updatePreAuthConfig();
}

// Auto-populate from @PRE-AUTH request
function autoPopulateFromPreAuthRequest() {
  const preAuthRequest = findPreAuthRequest();
  if (!preAuthRequest) {
    return;
  }

  const curlCommand = buildCurlCommandFromRequest(preAuthRequest);

  // Populate the fields
  document.getElementById("preAuthCurl").value = curlCommand;
  document.getElementById("preAuthUsername").value = "";
  document.getElementById("preAuthPassword").value = "";
  document.getElementById("preAuthPath").value =
    preAuthRequest.preAuth?.responsePath || "";

  // Update global config
  globalPreAuthConfig.curlCommand = curlCommand;
  globalPreAuthConfig.responsePath = preAuthRequest.preAuth?.responsePath || "";
}

// Render pre-auth configuration
function renderPreAuth(preAuth) {
  const arrow = document.getElementById("preAuthArrow");
  document.getElementById("preAuthEnabled").checked = preAuth.enabled;
  document.getElementById("preAuthContent").style.display = preAuth.enabled
    ? "block"
    : "none";

  if (preAuth.enabled) {
    arrow.classList.add("expanded");
  } else {
    arrow.classList.remove("expanded");
  }

  document.getElementById("preAuthCurl").value = preAuth.curlCommand;
  document.getElementById("preAuthPath").value = preAuth.responsePath || "";
  document.getElementById("preAuthUsername").value = preAuth.username || "";
  document.getElementById("preAuthPassword").value = preAuth.password || "";
}

// Update pre-auth configuration
function updatePreAuthConfig() {
  globalPreAuthConfig.enabled =
    document.getElementById("preAuthEnabled").checked;
  globalPreAuthConfig.curlCommand =
    document.getElementById("preAuthCurl").value;
  globalPreAuthConfig.responsePath =
    document.getElementById("preAuthPath").value;
  globalPreAuthConfig.username =
    document.getElementById("preAuthUsername").value;
  globalPreAuthConfig.password =
    document.getElementById("preAuthPassword").value;
}

// Render query params
function renderQueryParams(queryParams) {
  const container = document.getElementById("queryEditor");
  container.innerHTML = "";

  queryParams.forEach((param) => {
    addQueryParamRow(param.key, param.value, param.enabled);
  });

  // Add empty row for new query param
  if (queryParams.length === 0) {
    addQueryParamRow();
  }
}

// Add query param row
function addQueryParamRow(key = "", value = "", enabled = true) {
  const container = document.getElementById("queryEditor");
  const row = document.createElement("div");
  row.className = "query-param-row";
  row.innerHTML = `
                <input type="checkbox" ${
                  enabled ? "checked" : ""
                } onchange="updateCurrentRequest()">
                <input type="text" placeholder="Parameter Name" value="${escapeHtml(
                  key
                )}" onchange="updateCurrentRequest()">
                <input type="text" placeholder="Parameter Value" value="${escapeHtml(
                  value
                )}" onchange="updateCurrentRequest()">
                <button class="btn-remove-header" onclick="this.parentElement.remove(); updateCurrentRequest();">✕</button>
            `;
  container.appendChild(row);
}

// Render headers
function renderHeaders(headers) {
  const container = document.getElementById("headersEditor");
  container.innerHTML = "";

  Object.entries(headers).forEach(([key, value]) => {
    addHeaderRow(key, value);
  });

  // Add empty row for new header
  if (Object.keys(headers).length === 0) {
    addHeaderRow();
  }
}

// Add header row
function addHeaderRow(key = "", value = "") {
  const container = document.getElementById("headersEditor");
  const row = document.createElement("div");
  row.className = "header-row";
  row.innerHTML = `
                <input type="text" placeholder="Header Name" value="${escapeHtml(
                  key
                )}" onchange="updateCurrentRequest()">
                <input type="text" placeholder="Header Value" value="${escapeHtml(
                  value
                )}" onchange="updateCurrentRequest()">
                <button class="btn-remove-header" onclick="this.parentElement.remove(); updateCurrentRequest();">✕</button>
            `;
  container.appendChild(row);
}

// Render variables
function renderVariables(variables) {
  const container = document.getElementById("variablesEditor");
  container.innerHTML = "";

  const varEntries = Object.entries(variables);

  varEntries.forEach(([name, value]) => {
    addVariableRow(name, value);
  });

  // Add empty row for new variable
  if (varEntries.length === 0) {
    addVariableRow();
  }

  updateVariableUsageIndicators();
}

// Add variable row
function addVariableRow(name = "", value = "") {
  const container = document.getElementById("variablesEditor");
  const row = document.createElement("div");
  row.className = "variable-row";

  row.innerHTML = `
                <span class="variable-prefix">@</span>
                <input type="text" class="variable-name-input" placeholder="variableName" value="${escapeHtml(
                  name
                )}" onchange="updateCurrentRequest()">
                <span class="variable-equals">=</span>
                <input type="text" class="variable-value-input" placeholder="value" value="${escapeHtml(
                  value
                )}" onchange="updateCurrentRequest()">
                <span class="variable-usage"></span>
                <button class="btn-remove-header" onclick="this.parentElement.remove(); updateCurrentRequest();">✕</button>
            `;
  container.appendChild(row);
}

function updateVariableUsageIndicators() {
  const request = requests.find((r) => r.id === currentRequestId);
  if (!request) return;

  document.querySelectorAll("#variablesEditor .variable-row").forEach((row) => {
    const nameInput = row.querySelector(".variable-name-input");
    const usageNode = row.querySelector(".variable-usage");
    if (!nameInput || !usageNode) return;

    const name = nameInput.value.trim();
    if (!name) {
      usageNode.textContent = "";
      usageNode.classList.remove("used", "unused");
      row.classList.remove("used");
      return;
    }

    const count = countVariableUsage(request, name);
    usageNode.textContent = count > 0 ? "used " + count : "unused";
    usageNode.classList.toggle("used", count > 0);
    usageNode.classList.toggle("unused", count === 0);

    // Highlight the entire row if variable is used
    row.classList.toggle("used", count > 0);
  });
}

// Count variable usage in request
function countVariableUsage(request, variableName) {
  if (!request) return 0;

  let count = 0;
  const pattern = new RegExp(`{{\\s*${variableName}\\s*}}`, "g");

  // Check URL
  if (request.url) {
    const matches = request.url.match(pattern);
    count += matches ? matches.length : 0;
  }

  // Check headers
  if (request.headers) {
    Object.values(request.headers).forEach((value) => {
      if (value) {
        const matches = value.match(pattern);
        count += matches ? matches.length : 0;
      }
    });
  }

  // Check body
  if (request.body) {
    const matches = request.body.match(pattern);
    count += matches ? matches.length : 0;
  }

  return count;
}

// Update current request
function updateCurrentRequest() {
  const request = requests.find((r) => r.id === currentRequestId);
  if (!request) return;

  request.name = document.getElementById("requestName").value;
  request.method = document.getElementById("methodSelect").value;
  request.body = document.getElementById("bodyInput").value;
  request.bodyType = document.getElementById("bodyTypeSelect").value;

  // Collect query params
  const queryParams = [];
  document.querySelectorAll("#queryEditor .query-param-row").forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const inputs = row.querySelectorAll('input[type="text"]');
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (key) {
      queryParams.push({
        key: key,
        value: value,
        enabled: checkbox.checked,
      });
    }
  });
  request.queryParams = queryParams;

  // Collect headers
  const headers = {};
  document.querySelectorAll("#headersEditor .header-row").forEach((row) => {
    const inputs = row.querySelectorAll("input");
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (key) {
      headers[key] = value;
    }
  });
  request.headers = headers;

  // Collect variables
  const variables = {};
  document.querySelectorAll("#variablesEditor .variable-row").forEach((row) => {
    const nameInput = row.querySelector(".variable-name-input");
    const valueInput = row.querySelector(".variable-value-input");
    if (nameInput && valueInput) {
      const name = nameInput.value.trim();
      const value = valueInput.value.trim();
      if (name) {
        variables[name] = value;
      }
    }
  });
  request.variables = variables;

  // Update variables for all requests (they are global)
  requests.forEach((req) => {
    req.variables = variables;
  });

  // Build URL with query params
  request.url = buildUrlWithQueryParams();

  // Update URL input
  document.getElementById("urlInput").value = request.url;

  // Auto-set Content-Type if not specified
  updateContentTypeHeader(request);

  // Update URL preview
  updateUrlPreview();

  updateVariableUsageIndicators();
  renderRequestList();
}

// Smart encode URI component that preserves variable templates
function smartEncodeURIComponent(str) {
  if (!str) return "";

  // Replace variable templates with placeholders
  const variablePattern = /\{\{\s*\w+\s*\}\}/g;
  const variables = [];
  let tempStr = str;

  // Extract and store variable templates
  let match;
  while ((match = variablePattern.exec(str)) !== null) {
    variables.push(match[0]);
  }

  // Replace variables with unique placeholders
  variables.forEach((variable, index) => {
    tempStr = tempStr.replace(variable, "__VAR_" + index + "__");
  });

  // Encode the string
  let encoded = encodeURIComponent(tempStr);

  // Restore variables
  variables.forEach((variable, index) => {
    encoded = encoded.replace("__VAR_" + index + "__", variable);
  });

  return encoded;
}

// Build URL with query params
function buildUrlWithQueryParams() {
  const urlInput = document.getElementById("urlInput").value;
  let baseUrl = urlInput;

  // Remove existing query string from URL
  const questionMarkIndex = baseUrl.indexOf("?");
  if (questionMarkIndex !== -1) {
    baseUrl = baseUrl.substring(0, questionMarkIndex);
  }

  // Collect current query params from form
  const queryParams = [];
  document.querySelectorAll("#queryEditor .query-param-row").forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const inputs = row.querySelectorAll('input[type="text"]');
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (key && checkbox.checked) {
      queryParams.push({ key, value });
    }
  });

  if (queryParams.length === 0) {
    return baseUrl;
  }

  const queryString = queryParams
    .map(
      (p) =>
        `${smartEncodeURIComponent(p.key)}=${smartEncodeURIComponent(p.value)}`
    )
    .join("&");

  return `${baseUrl}?${queryString}`;
}

// Parse URL and extract query params
function parseUrlQueryParams(url) {
  const queryParams = [];
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      queryParams.push({
        key: key,
        value: value,
        enabled: true,
      });
    });
  } catch (e) {
    // Invalid URL, try to parse query string manually
    const questionMarkIndex = url.indexOf("?");
    if (questionMarkIndex !== -1) {
      const queryString = url.substring(questionMarkIndex + 1);
      const pairs = queryString.split("&");
      pairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key) {
          queryParams.push({
            key: decodeURIComponent(key),
            value: decodeURIComponent(value || ""),
            enabled: true,
          });
        }
      });
    }
  }
  return queryParams;
}

// Update URL preview with variable highlighting
function updateUrlPreview() {
  const urlInput = document.getElementById("urlInput");
  const urlPreview = document.getElementById("urlPreview");
  const request = requests.find((r) => r.id === currentRequestId);

  if (!request || !urlInput || !urlPreview) return;

  const url = urlInput.value;
  const variables = request.variables || {};

  // Find all variables in the URL
  const variablePattern = /{{(\s*\w+\s*)}}/g;
  let html = "";
  let lastIndex = 0;
  let match;

  while ((match = variablePattern.exec(url)) !== null) {
    const varName = match[1].trim();
    const varValue = variables[varName];

    // Add text before variable
    html += escapeHtml(url.substring(lastIndex, match.index));

    // Add highlighted variable with tooltip
    if (varValue !== undefined) {
      html += `<span class="variable-highlight">${escapeHtml(
        match[0]
      )}<span class="variable-tooltip">@${escapeHtml(varName)} = ${escapeHtml(
        varValue
      )}</span></span>`;
    } else {
      html += `<span class="variable-highlight variable-undefined">${escapeHtml(
        match[0]
      )}<span class="variable-tooltip">Variable not defined</span></span>`;
    }

    lastIndex = variablePattern.lastIndex;
  }

  // Add remaining text
  html += escapeHtml(url.substring(lastIndex));

  urlPreview.innerHTML = html;

  // Sync scroll after DOM update so highlights stay aligned.
  requestAnimationFrame(syncUrlPreviewScroll);
}

function getBodyHighlightLanguage(bodyType) {
  switch (bodyType) {
    case "json":
      return "json";
    case "xml":
    case "html":
      return "xml";
    case "javascript":
      return "javascript";
    default:
      return "plaintext";
  }
}

function highlightUrlEncoded(value) {
  if (!value) {
    return "";
  }

  const parts = value.split("&");
  const highlightedParts = parts.map((part) => {
    const equalsIndex = part.indexOf("=");
    if (equalsIndex === -1) {
      return (
        '<span class="body-urlencoded-key">' + escapeHtml(part) + "</span>"
      );
    }

    const key = part.slice(0, equalsIndex);
    const val = part.slice(equalsIndex + 1);
    return (
      '<span class="body-urlencoded-key">' +
      escapeHtml(key) +
      "</span>" +
      '<span class="body-urlencoded-eq">=</span>' +
      '<span class="body-urlencoded-value">' +
      escapeHtml(val) +
      "</span>"
    );
  });

  return highlightedParts.join('<span class="body-urlencoded-amp">&</span>');
}

function updateBodyHighlight() {
  const bodyInput = document.getElementById("bodyInput");
  const highlightCode = document.getElementById("bodyHighlight");
  if (!bodyInput || !highlightCode) {
    return;
  }

  const bodyType = document.getElementById("bodyTypeSelect").value;
  const value = bodyInput.value || "";

  if (!value) {
    highlightCode.innerHTML = "";
    return;
  }

  try {
    if (bodyType === "urlencoded") {
      highlightCode.innerHTML = highlightUrlEncoded(value);
    } else {
      const language = getBodyHighlightLanguage(bodyType);
      const highlighted = hljs.highlight(value, { language }).value;
      highlightCode.innerHTML = highlighted || escapeHtml(value);
    }
  } catch {
    highlightCode.textContent = value;
  }
}

function formatXmlLike(raw, isHtml) {
  if (!raw) {
    return raw;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      raw,
      isHtml ? "text/html" : "application/xml"
    );

    if (!isHtml) {
      const parserError = doc.getElementsByTagName("parsererror");
      if (parserError && parserError.length > 0) {
        return raw;
      }
    }

    let serialized = "";
    if (isHtml) {
      const body = doc.body ? doc.body.innerHTML : raw;
      serialized = body || raw;
    } else {
      serialized = new XMLSerializer().serializeToString(doc);
    }

    const withBreaks = serialized.replace(/></g, ">\\n<");
    const lines = withBreaks.split("\\n");
    let indent = 0;
    const indentStr = "  ";

    const formattedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return "";
      }

      if (trimmed.match(/^<\//)) {
        indent = Math.max(indent - 1, 0);
      }

      const pad = indentStr.repeat(indent);
      const result = pad + trimmed;

      if (trimmed.match(/^<[^!?/][^>]*[^/]>$/)) {
        indent += 1;
      }

      return result;
    });

    return formattedLines.join("\\n").trim();
  } catch {
    return raw;
  }
}

function formatBodyIfNeeded() {
  const bodyInput = document.getElementById("bodyInput");
  if (!bodyInput) {
    return;
  }

  const bodyType = document.getElementById("bodyTypeSelect").value;
  if (bodyType !== "json" && bodyType !== "xml" && bodyType !== "html") {
    return;
  }

  const raw = bodyInput.value || "";
  if (!raw.trim()) {
    return;
  }

  try {
    if (bodyType === "json") {
      const parsed = JSON.parse(raw);
      const formatted = JSON.stringify(parsed, null, 2);
      if (formatted !== raw) {
        bodyInput.value = formatted;
        updateCurrentRequest();
        updateBodyHighlight();
        syncBodyScroll();
      }
    } else {
      const formatted = formatXmlLike(raw, bodyType === "html");
      if (formatted && formatted !== raw) {
        bodyInput.value = formatted;
        updateCurrentRequest();
        updateBodyHighlight();
        syncBodyScroll();
      }
    }
  } catch {
    // Ignore invalid JSON
  }
}

function syncBodyScroll() {
  const bodyInput = document.getElementById("bodyInput");
  const highlightContainer = document.querySelector(".body-highlight-layer");
  if (!bodyInput || !highlightContainer) {
    return;
  }

  highlightContainer.scrollTop = bodyInput.scrollTop;
  highlightContainer.scrollLeft = bodyInput.scrollLeft;
}

function handleBodyInput() {
  updateCurrentRequest();
  updateBodyHighlight();
}

// Handle URL change
function onUrlChange() {
  const request = requests.find((r) => r.id === currentRequestId);
  if (!request) return;

  const url = document.getElementById("urlInput").value;

  // Parse query params from URL
  const parsedParams = parseUrlQueryParams(url);

  // Update request query params
  request.queryParams = parsedParams;

  // Re-render query params
  renderQueryParams(parsedParams);

  // Update the request
  updateCurrentRequest();

  // Update URL preview
  updateUrlPreview();
}

// Update request body type
function updateBodyType() {
  const request = requests.find((r) => r.id === currentRequestId);
  if (!request) return;

  const newBodyType = document.getElementById("bodyTypeSelect").value;
  request.bodyType = newBodyType;

  // Update Content-Type header when body type changes
  const contentTypeMap = {
    json: "application/json",
    urlencoded: "application/x-www-form-urlencoded",
    xml: "application/xml",
    html: "text/html",
    javascript: "application/javascript",
    text: "text/plain",
  };

  if (contentTypeMap[newBodyType] && request.body && request.body.trim()) {
    // Find and update existing Content-Type header (case-insensitive)
    const contentTypeKey = Object.keys(request.headers).find(
      (key) => key.toLowerCase() === "content-type"
    );

    if (contentTypeKey) {
      request.headers[contentTypeKey] = contentTypeMap[newBodyType];
    } else {
      request.headers["Content-Type"] = contentTypeMap[newBodyType];
    }

    // Re-render headers to show updated value
    renderHeaders(request.headers || {});
  }

  updateCurrentRequest();
  updateBodyHighlight();
  formatBodyIfNeeded();
}

// Auto-update Content-Type header
function updateContentTypeHeader(request) {
  const bodyType = request.bodyType || "text";
  const hasContentType = Object.keys(request.headers).some(
    (key) => key.toLowerCase() === "content-type"
  );

  // If Content-Type not set manually and request body exists
  if (!hasContentType && request.body && request.body.trim()) {
    const contentTypeMap = {
      json: "application/json",
      urlencoded: "application/x-www-form-urlencoded",
      xml: "application/xml",
      html: "text/html",
      javascript: "application/javascript",
      text: "text/plain",
    };

    if (contentTypeMap[bodyType]) {
      request.headers["Content-Type"] = contentTypeMap[bodyType];
    }
  }
}

// Add new request
function addNewRequest() {
  // Get variables from the first request if available
  const existingVariables =
    requests.length > 0 ? requests[0].variables || {} : {};

  const newRequest = {
    id: Date.now() + Math.random(),
    name: "New Request",
    method: "GET",
    url: "https://api.example.com",
    headers: {},
    queryParams: [],
    body: "",
    bodyType: "text",
    variables: existingVariables,
  };

  requests.push(newRequest);
  currentRequestId = newRequest.id;
  renderRequestList();
  selectRequest(currentRequestId);
}

// Delete request
function deleteRequest(id) {
  if (requests.length === 1) {
    vscode.postMessage({
      command: "log",
      text: "Cannot delete the last request",
    });
    return;
  }

  const index = requests.findIndex((r) => r.id === id);
  if (index !== -1) {
    requests.splice(index, 1);

    // Select another request
    if (currentRequestId === id) {
      currentRequestId = requests[0].id;
      selectRequest(currentRequestId);
    }

    renderRequestList();
  }
}

// Replace variables in string
function replaceVariables(text, variables) {
  if (!text) return text;

  let result = text;
  const mergedVariables = { ...(variables || {}), ...sessionVariables };
  Object.entries(mergedVariables).forEach(([name, value]) => {
    const pattern = new RegExp(`{{\\s*${name}\\s*}}`, "g");
    result = result.replace(pattern, value);
  });

  return result;
}

function ensureAuthVariableEmpty() {
  const request = requests.find((r) => r.id === currentRequestId);
  if (!request) {
    return;
  }

  const variables = { ...(request.variables || {}) };
  const hadAuth = Object.prototype.hasOwnProperty.call(variables, "auth");

  if (!hadAuth || variables.auth !== "") {
    variables.auth = "";
    requests.forEach((req) => {
      req.variables = variables;
    });
    renderVariables(variables);
  }
}

function showNotification(message, type = "info") {
  const container = document.getElementById("notificationContainer");
  if (!container) {
    return;
  }

  const notification = document.createElement("div");
  notification.className = "notification notification-" + type;

  const messageNode = document.createElement("span");
  messageNode.textContent = message;
  notification.appendChild(messageNode);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Dismiss notification");
  closeButton.textContent = "×";
  closeButton.onclick = () => {
    if (notification.parentElement === container) {
      container.removeChild(notification);
    }
  };

  notification.appendChild(closeButton);
  container.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement === container) {
      container.removeChild(notification);
    }
  }, 5000);
}

// Send request
async function sendRequest() {
  updateCurrentRequest();

  const request = requests.find((r) => r.id === currentRequestId);
  if (!request) return;

  const sendButton = document.getElementById("sendButton");
  sendButton.disabled = true;

  // Check if pre-auth is enabled (using global config)
  if (globalPreAuthConfig.enabled) {
    // Execute pre-auth request first
    sendButton.textContent = "Authenticating...";

    try {
      await executePreAuth(request, request.variables || {});
    } catch (error) {
      console.error("Pre-auth error:", error);
      showNotification("Pre-authentication failed: " + error.message, "error");
      sendButton.disabled = false;
      sendButton.textContent = "Send";
      return;
    }
  }

  // Create a copy of the request with variables replaced
  const processedRequest = {
    ...request,
    url: replaceVariables(request.url, request.variables),
    headers: {},
    body: replaceVariables(request.body, request.variables),
  };

  // Replace variables in headers
  Object.entries(request.headers).forEach(([key, value]) => {
    processedRequest.headers[key] = replaceVariables(value, request.variables);
  });

  // Validate URL
  if (!processedRequest.url || !processedRequest.url.startsWith("http")) {
    showNotification(
      "Please enter a valid URL starting with http:// or https://",
      "error"
    );
    sendButton.disabled = false;
    sendButton.textContent = "Send";
    return;
  }

  sendButton.textContent = "Sending...";

  vscode.postMessage({
    command: "sendRequest",
    request: processedRequest,
  });

  // Switch to Response tab
  switchTab("response");
}

// Execute pre-auth request
function executePreAuth(request, variables) {
  return new Promise((resolve, reject) => {
    if (!globalPreAuthConfig.curlCommand || !globalPreAuthConfig.responsePath) {
      reject(new Error("Pre-auth configuration is incomplete"));
      return;
    }

    console.log("Executing pre-auth with config:", {
      curlCommand: globalPreAuthConfig.curlCommand,
      responsePath: globalPreAuthConfig.responsePath,
      hasUsername: !!globalPreAuthConfig.username,
      hasPassword: !!globalPreAuthConfig.password,
      variables: variables,
    });

    // Store callback for handling response
    window.preAuthCallback = (success, authToken, error) => {
      if (success) {
        console.log("Pre-auth success, token:", authToken);
        // Store token in memory only (do not persist)
        sessionVariables.auth = authToken;
        ensureAuthVariableEmpty();
        resolve();
      } else {
        console.error("Pre-auth failed:", error);
        reject(new Error(error || "Pre-authentication failed"));
      }
    };

    // Send pre-auth request to extension
    vscode.postMessage({
      command: "executePreAuth",
      preAuth: globalPreAuthConfig,
      variables: variables,
      requestId: request.id,
    });
  });
}

// Export to cURL
function exportToCurl() {
  updateCurrentRequest();

  const request = requests.find((r) => r.id === currentRequestId);
  if (!request) return;

  vscode.postMessage({
    command: "exportToCurl",
    request: request,
  });
}

// Save all requests
function saveAllRequests() {
  updateCurrentRequest();

  vscode.postMessage({
    command: "saveRequests",
    requests: requests,
    preAuth: {
      enabled: globalPreAuthConfig.enabled,
      curlCommand: globalPreAuthConfig.curlCommand,
      responsePath: globalPreAuthConfig.responsePath,
      username: globalPreAuthConfig.username,
      password: globalPreAuthConfig.password,
    },
  });
}

function findPreAuthRequest() {
  return requests.find(
    (r) =>
      r.isPreAuthRequest === true ||
      (r.name && r.name.trim().toUpperCase() === "@PRE-AUTH")
  );
}

function hydrateGlobalPreAuthConfigFromRequests() {
  const preAuthRequest = findPreAuthRequest();
  if (!preAuthRequest) {
    return;
  }
  globalPreAuthConfig.enabled = true;
  globalPreAuthConfig.curlCommand = buildCurlCommandFromRequest(preAuthRequest);
  globalPreAuthConfig.responsePath = preAuthRequest.preAuth?.responsePath || "";
}

function buildCurlCommandFromRequest(preAuthRequest) {
  if (!preAuthRequest) {
    return "";
  }

  let curlCommand = `curl -X ${preAuthRequest.method} ${preAuthRequest.url}`;

  const headers = preAuthRequest.headers || {};
  for (const [key, value] of Object.entries(headers)) {
    if (key && value) {
      curlCommand += ` -H '${key}: ${value}'`;
    }
  }

  if (preAuthRequest.body && preAuthRequest.body.trim()) {
    const sanitizedBody = replacePreAuthCredentials(preAuthRequest.body);
    // Remove all newlines and extra whitespace from body
    const cleanBody = sanitizedBody
      .replace(/\r?\n|\r/g, "")
      .replace(/\s+/g, " ")
      .trim();
    curlCommand += ` -d '${cleanBody}'`;
  }

  return curlCommand;
}

function replacePreAuthCredentials(body) {
  let sanitized = body;

  // JSON format replacements
  const replacements = [
    {
      pattern: /"email"\s*:\s*"[^"]*"/gi,
      replacement: '"email": "{{username}}"',
    },
    {
      pattern: /"username"\s*:\s*"[^"]*"/gi,
      replacement: '"username": "{{username}}"',
    },
    {
      pattern: /"user"\s*:\s*"[^"]*"/gi,
      replacement: '"user": "{{username}}"',
    },
    {
      pattern: /"password"\s*:\s*"[^"]*"/gi,
      replacement: '"password": "{{password}}"',
    },
    {
      pattern: /"pass"\s*:\s*"[^"]*"/gi,
      replacement: '"pass": "{{password}}"',
    },
  ];

  replacements.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  // URL-encoded form data replacements
  sanitized = sanitized.replace(
    /\b(username|email|user)=([^&\s]*)/gi,
    "$1={{username}}"
  );
  sanitized = sanitized.replace(
    /\b(password|pass)=([^&\s]*)/gi,
    "$1={{password}}"
  );

  return sanitized;
}

// Switch tabs
function switchTab(tabName) {
  // Remove active class from all tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  // Activate selected tab
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}-tab`).classList.add("active");
}

// Switch response tabs
function switchResponseTab(tabName) {
  document.querySelectorAll(".response-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".response-body").forEach((body) => {
    body.classList.remove("active");
  });

  document
    .querySelector(`.response-tab[data-tab="${tabName}"]`)
    .classList.add("active");
  document.getElementById(`response-${tabName}`).classList.add("active");
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Format JSON
function formatJson(json) {
  try {
    if (typeof json === "string") {
      json = JSON.parse(json);
    }
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return json;
  }
}

// Format and highlight JSON
function formatAndHighlightJson(json) {
  try {
    let formatted;
    if (typeof json === "string") {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(json);
        formatted = JSON.stringify(parsed, null, 2);
      } catch {
        // Not valid JSON, return as is
        return escapeHtml(json);
      }
    } else {
      formatted = JSON.stringify(json, null, 2);
    }

    // Highlight the formatted JSON
    const highlighted = hljs.highlight(formatted, { language: "json" }).value;
    return highlighted;
  } catch (e) {
    return escapeHtml(typeof json === "string" ? json : JSON.stringify(json));
  }
}

// Handle messages from extension
window.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.command) {
    case "requestComplete":
      handleRequestComplete(message.response);
      break;
    case "saveComplete":
      if (message.success) {
        const saveBtn = document.querySelector(".save-button");
        const originalText = saveBtn.textContent;
        saveBtn.textContent = "✓ Saved!";
        setTimeout(() => {
          saveBtn.textContent = originalText;
        }, 2000);
      }
      break;
    case "updateVariables":
      handleVariablesUpdate(message.variables);
      break;
  }
});

// Handle variables update from extension
function handleVariablesUpdate(newVariables) {
  const incoming = newVariables || {};

  // Apply new config variables to every request, letting incoming values override old ones
  requests.forEach((req) => {
    const existing = req.variables || {};
    req.variables = {
      ...existing,
      ...incoming,
    };
  });

  // Re-render the active request so the Variables tab reflects the change immediately
  if (currentRequestId !== null) {
    const request = requests.find((r) => r.id === currentRequestId);
    if (request) {
      renderVariables(request.variables || {});
    }
  }
}

// Handle request complete
function handleRequestComplete(response) {
  lastResponse = response;

  const sendButton = document.getElementById("sendButton");
  sendButton.disabled = false;
  sendButton.textContent = "Send";

  // Render response
  const container = document.getElementById("responseContainer");
  const statusClass =
    response.isError || response.status >= 400
      ? "status-error"
      : "status-success";

  container.innerHTML = `
                <div class="response-section">
                    <div class="response-header">
                        <div class="response-status ${statusClass}">
                            Status: ${response.status} ${escapeHtml(
    response.statusText
  )}
                        </div>
                        <div class="response-time">
                            Time: ${response.duration}ms
                        </div>
                    </div>

                    <div class="response-tabs">
                        <div class="response-tab active" data-tab="body" onclick="switchResponseTab('body')">Body</div>
                        <div class="response-tab" data-tab="headers" onclick="switchResponseTab('headers')">Headers</div>
                    </div>

                    <div class="response-content">
                        <div class="response-body active" id="response-body">
                            <pre><code class="hljs language-json">${formatAndHighlightJson(
                              response.data
                            )}</code></pre>
                        </div>
                        <div class="response-body" id="response-headers">
                            <pre><code class="hljs language-json">${formatAndHighlightJson(
                              response.headers
                            )}</code></pre>
                        </div>
                    </div>
                </div>
            `;
}

// Import modal functions
function openImportModal() {
  const modal = document.getElementById("importModal");
  modal.classList.add("show");
}

function closeImportModal() {
  const modal = document.getElementById("importModal");
  modal.classList.remove("show");
  // Reset form
  document.getElementById("importTextInput").value = "";
  document.getElementById("importFileInput").value = "";
}

function switchImportTab(tab) {
  // Update tab buttons
  const tabs = document.querySelectorAll(".import-tab");
  tabs.forEach((t) => t.classList.remove("active"));
  event.target.classList.add("active");

  // Update tab content
  const fileTab = document.getElementById("import-file-tab");
  const textTab = document.getElementById("import-text-tab");

  if (tab === "file") {
    fileTab.classList.add("active");
    textTab.classList.remove("active");
  } else {
    textTab.classList.add("active");
    fileTab.classList.remove("active");
  }
}

// File drop zone handling
const dropZone = document.getElementById("fileDropZone");
if (dropZone) {
  dropZone.addEventListener("click", () => {
    document.getElementById("importFileInput").click();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileRead(files[0]);
    }
  });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    handleFileRead(file);
  }
}

function handleFileRead(file) {
  if (!file.name.endsWith(".json")) {
    vscode.postMessage({
      command: "log",
      text: "Please select a JSON file",
    });
    showNotification("Please select a JSON file", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    processImport(content);
  };
  reader.onerror = () => {
    showNotification("Failed to read file", "error");
  };
  reader.readAsText(file);
}

function handleTextImport() {
  const content = document.getElementById("importTextInput").value.trim();
  if (!content) {
    showNotification("Please paste content to import", "error");
    return;
  }
  processImport(content);
}

function processImport(content) {
  vscode.postMessage({
    command: "importRequests",
    content: content,
  });
}

// Handle import response from extension
window.addEventListener("message", (event) => {
  const message = event.data;

  if (message.command === "importComplete") {
    if (message.success) {
      // Add imported requests to the list
      if (message.requests && message.requests.length > 0) {
        requests.push(...message.requests);
        renderRequestList();

        // Select first imported request
        selectRequest(message.requests[0].id);
        showNotification(
          "Successfully imported " + message.requests.length + " request(s)",
          "success"
        );
        closeImportModal();

        vscode.postMessage({
          command: "log",
          text: `Successfully imported ${message.requests.length} request(s)`,
        });
      } else {
        showNotification(
          "Import completed but no requests were found.",
          "info"
        );
      }
    } else {
      showNotification(
        "Import failed: " + (message.error || "Unknown error"),
        "error"
      );
    }
  } else if (message.command === "preAuthComplete") {
    // Handle pre-auth response
    if (window.preAuthCallback) {
      window.preAuthCallback(message.success, message.authToken, message.error);
      delete window.preAuthCallback;
    }
  }
});

// Close modal on ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("importModal");
    if (modal.classList.contains("show")) {
      closeImportModal();
    }
  }
});

// Close modal when clicking outside
document.getElementById("importModal")?.addEventListener("click", (e) => {
  if (e.target.id === "importModal") {
    closeImportModal();
  }
});

// Initialize on load
const initialConfig = initialState.config;
initConfig(initialConfig);
init();
