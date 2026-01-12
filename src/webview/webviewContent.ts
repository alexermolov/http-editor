import { HttpRequest, ExtensionConfig } from "../types";

/**
 * HTML content generator for WebView
 */
export class WebviewContentGenerator {
  /**
   * Generates HTML content for WebView
   */
  public generate(requests: HttpRequest[], filePath: string, config?: ExtensionConfig): string {
    const requestsJson = JSON.stringify(requests);
    const configJson = JSON.stringify(config || null);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://cdnjs.cloudflare.com; script-src 'unsafe-inline' https://cdnjs.cloudflare.com; img-src https: data:;">
    <title>HTTP Editor</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js"></script>
    ${this.generateStyles()}
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-title">Requests</div>
                <button class="btn-add" onclick="addNewRequest()">+ New</button>
            </div>
            
            <!-- Environment & Config Selectors -->
            <div class="config-selectors" id="configSelectors" style="display: none;">
                <div class="form-group-compact">
                    <label class="form-label-compact">Environment:</label>
                    <select id="environmentSelect" onchange="changeEnvironment(this.value)">
                        <option value="">No Environment</option>
                    </select>
                </div>
                <div class="form-group-compact">
                    <label class="form-label-compact">User:</label>
                    <select id="userSelect" onchange="changeUser(this.value)">
                        <option value="">No User</option>
                    </select>
                </div>
                <div class="form-group-compact">
                    <label class="form-label-compact">Locale:</label>
                    <select id="localeSelect" onchange="changeLocale()">
                        <option value="">Default</option>
                    </select>
                </div>
            </div>
            
            <div class="request-list" id="requestList"></div>
        </div>

        <div class="main-content">
            <div class="new-request-group">
                <button class="btn-import" onclick="openImportModal()" title="Import Postman Collection or cURL">📥 Import</button>
            </div>
            
            <div class="pre-auth-section" id="preAuthSection">
                <div class="pre-auth-header">
                    <div class="pre-auth-toggle" onclick="togglePreAuthExpand()">
                        <label onclick="event.stopPropagation()" style="display: flex; align-items: center; gap: 8px; margin: 0;">
                            <input type="checkbox" id="preAuthEnabled" onchange="togglePreAuth()">
                            <span>Pre-Request Authentication</span>
                        </label>
                        <span class="pre-auth-arrow" id="preAuthArrow">▼</span>
                    </div>
                </div>
                <div class="pre-auth-content" id="preAuthContent" style="display: none;">
                    <div class="pre-auth-info">
                        <p>Execute an authentication request before the main request. The response value will be stored in the <code>@auth</code> variable.</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Authentication cURL Command</label>
                        <textarea id="preAuthCurl" placeholder="curl -X POST https://api.example.com/auth -H 'Content-Type: application/json' -d '{&quot;username&quot;: &quot;{{username}}&quot;, &quot;password&quot;: &quot;{{password}}&quot;}'" onchange="updatePreAuthConfig()" rows="4"></textarea>
                    </div>
                    <div class="pre-auth-credentials">
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" id="preAuthUsername" placeholder="Enter username" onchange="updatePreAuthConfig()">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" id="preAuthPassword" placeholder="Enter password" onchange="updatePreAuthConfig()">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Response JSON Path</label>
                        <input type="text" id="preAuthPath" placeholder="e.g., token or data.access_token" onchange="updatePreAuthConfig()">
                        <small style="color: var(--vscode-descriptionForeground); margin-top: 4px; display: block;">Path to extract the auth value from the JSON response</small>
                    </div>
                </div>
            </div>
            
            <div class="editor-header">
                
                <div class="input-group">
                    <input type="text" id="requestName" placeholder="Request Name" onchange="updateCurrentRequest()">
                    <select id="methodSelect" onchange="updateCurrentRequest()">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                        <option value="HEAD">HEAD</option>
                        <option value="OPTIONS">OPTIONS</option>
                    </select>
                    <div class="url-input-wrapper">
                        <input type="text" id="urlInput" placeholder="https://api.example.com/endpoint" onchange="onUrlChange()" oninput="updateUrlPreview()">
                        <div class="url-preview" id="urlPreview"></div>
                    </div>
                </div>
                <button class="btn-export" onclick="exportToCurl()" title="Export to cURL">📋 cURL</button>
                <button class="btn-send" id="sendButton" onclick="sendRequest()">Send</button>
            </div>

            <div class="editor-body">
                <div class="tabs">
                    <div class="tab active" data-tab="query" onclick="switchTab('query')">Query</div>
                    <div class="tab" data-tab="headers" onclick="switchTab('headers')">Headers</div>
                    <div class="tab" data-tab="body" onclick="switchTab('body')">Body</div>
                    <div class="tab" data-tab="variables" onclick="switchTab('variables')">Variables</div>
                    <div class="tab" data-tab="response" onclick="switchTab('response')">Response</div>
                </div>

                <div class="tab-content active" id="query-tab">
                    <div class="query-editor" id="queryEditor"></div>
                    <button class="btn-add-header" onclick="addQueryParamRow()">+ Add Query Parameter</button>
                </div>

                <div class="tab-content" id="headers-tab">
                    <div class="headers-editor" id="headersEditor"></div>
                    <button class="btn-add-header" onclick="addHeaderRow()">+ Add Header</button>
                </div>

                <div class="tab-content" id="body-tab">
                    <div class="form-group">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <label class="form-label" style="margin-bottom: 0;">Request Body</label>
                            <select id="bodyTypeSelect" onchange="updateBodyType()" style="width: auto; padding: 4px 8px;">
                                <option value="text">Text</option>
                                <option value="json">JSON</option>
                                <option value="urlencoded">URL Encoded</option>
                                <option value="xml">XML</option>
                                <option value="html">HTML</option>
                                <option value="javascript">JavaScript</option>
                            </select>
                        </div>
                        <textarea id="bodyInput" placeholder="Enter request body" onchange="updateCurrentRequest()"></textarea>
                    </div>
                </div>

                <div class="tab-content" id="variables-tab">
                    <div class="variables-info">
                        <p>Variables are defined in the .http file using the format: <code>@variableName = value</code></p>
                        <p>Use variables in requests with the format: <code>{{variableName}}</code></p>
                    </div>
                    <div class="variables-editor" id="variablesEditor"></div>
                    <button class="btn-add-header" onclick="addVariableRow()">+ Add Variable</button>
                </div>

                <div class="tab-content" id="response-tab">
                    <div id="responseContainer" class="empty-state">
                        <p>No response yet. Send a request to see the response.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <button class="save-button" onclick="saveAllRequests()">💾 Save All</button>

    <div id="notificationContainer"></div>

    <!-- Import Modal -->
    <div id="importModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Import Requests</h2>
                <button class="modal-close" onclick="closeImportModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="import-tabs">
                    <button class="import-tab active" onclick="switchImportTab('file')">From File</button>
                    <button class="import-tab" onclick="switchImportTab('text')">Paste Content</button>
                </div>
                
                <div id="import-file-tab" class="import-tab-content active">
                    <p class="import-description">Upload a Postman collection JSON file</p>
                    <input type="file" id="importFileInput" accept=".json" onchange="handleFileUpload(event)">
                    <div class="file-drop-zone" id="fileDropZone">
                        <p>📁 Drag and drop a JSON file here</p>
                        <p class="file-drop-hint">or click to browse</p>
                    </div>
                </div>
                
                <div id="import-text-tab" class="import-tab-content">
                    <p class="import-description">Paste a Postman collection (JSON) or cURL command</p>
                    <textarea id="importTextInput" placeholder="Paste your Postman collection JSON or cURL command here..." rows="10"></textarea>
                    <button class="btn-import-submit" onclick="handleTextImport()">Import</button>
                </div>
            </div>
        </div>
    </div>

    ${this.generateScript(requestsJson, configJson)}
</body>
</html>`;
  }

  /**
   * Generates CSS styles
   */
  private generateStyles(): string {
    return `<style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .container {
            display: flex;
            height: 100vh;
            overflow: hidden;
        }

        .sidebar {
            width: 300px;
            background-color: var(--vscode-sideBar-background);
            border-right: 1px solid var(--vscode-sideBar-border);
            display: flex;
            flex-direction: column;
        }

        .sidebar-header {
            padding: 16px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sidebar-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .btn-add {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        }

        .btn-add:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .config-selectors {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            background-color: var(--vscode-sideBar-background);
        }

        .form-group-compact {
            margin-bottom: 10px;
        }

        .form-group-compact:last-child {
            margin-bottom: 0;
        }

        .form-label-compact {
            display: block;
            font-size: 11px;
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }

        .config-selectors select {
            width: 100%;
            padding: 5px 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
            font-size: 12px;
            cursor: pointer;
        }

        .config-selectors select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }

        .request-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        .request-item {
            padding: 12px;
            margin-bottom: 4px;
            cursor: pointer;
            border-radius: 4px;
            transition: background-color 0.15s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .request-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .request-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }

        .request-info {
            flex: 1;
            min-width: 0;
        }

        .request-method {
            font-size: 11px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 3px;
            display: inline-block;
            margin-bottom: 4px;
        }

        .method-GET { background-color: #61affe; color: #fff; }
        .method-POST { background-color: #49cc90; color: #fff; }
        .method-PUT { background-color: #fca130; color: #fff; }
        .method-DELETE { background-color: #f93e3e; color: #fff; }
        .method-PATCH { background-color: #50e3c2; color: #fff; }
        .method-HEAD { background-color: #9012fe; color: #fff; }
        .method-OPTIONS { background-color: #0d5aa7; color: #fff; }

        .request-name {
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .btn-delete {
            background-color: transparent;
            color: var(--vscode-errorForeground);
            border: 1px solid var(--vscode-errorForeground);
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            opacity: 0;
            transition: opacity 0.15s;
        }

        .request-item:hover .btn-delete {
            opacity: 1;
        }

        .btn-delete:hover {
            background-color: var(--vscode-errorForeground);
            color: var(--vscode-button-foreground);
        }

        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .editor-header {
            padding: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 12px;
            align-items: center;
            background-color: var(--vscode-editor-background);
        }

        .input-group {
            display: flex;
            gap: 8px;
            flex: 3;
        }

        .url-input-wrapper {
            position: relative;
            flex: 2;
        }

        .url-preview {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 8px 12px;
            pointer-events: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 13px;
            line-height: 1.5;
            color: transparent;
        }

        .url-preview .variable-highlight {
            color: var(--vscode-symbolIcon-variableForeground, #4FC1FF);
            background-color: var(--vscode-editor-selectionBackground, rgba(79, 193, 255, 0.2));
            padding: 1px 3px;
            border-radius: 3px;
            cursor: help;
            position: relative;
            pointer-events: auto;
        }

        .variable-tooltip {
            position: absolute;
            bottom: calc(100% + 5px);
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--vscode-editorHoverWidget-background);
            border: 1px solid var(--vscode-editorHoverWidget-border);
            color: var(--vscode-editorHoverWidget-foreground);
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
        }

        .variable-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: var(--vscode-editorHoverWidget-border);
        }

        .variable-highlight:hover .variable-tooltip {
            opacity: 1;
        }

        select, input, textarea {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px 12px;
            border-radius: 3px;
            font-size: 13px;
            font-family: inherit;
        }

        select {
            min-width: 100px;
            cursor: pointer;
        }

        input[type="text"] {
            flex: 1;
        }

        #requestName {
            flex: 0 0 200px;
            min-width: 150px;
        }

        #methodSelect {
            flex: 0 0 auto;
        }

        #urlInput {
            position: relative;
            z-index: 1;
            background-color: transparent;
            width: 100%;
        }

        #urlInput:focus {
            background-color: var(--vscode-input-background);
        }

        #urlInput:focus ~ .url-preview {
            display: none;
        }

        .btn-send {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 24px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
        }

        .btn-send:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-send:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-new-request {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
        }

        .btn-new-request:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-export {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
        }

        .btn-export:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        /* Pre-Auth Section Styles */
        .pre-auth-section {
            margin: 16px;
            padding: 12px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .pre-auth-header {
            margin-bottom: 12px;
        }

        .pre-auth-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .pre-auth-toggle input[type="checkbox"] {
            width: auto;
            cursor: pointer;
            margin: 0;
        }

        .pre-auth-arrow {
            margin-left: auto;
            font-size: 10px;
            transition: transform 0.2s ease;
            color: var(--vscode-descriptionForeground);
        }

        .pre-auth-arrow.expanded {
            transform: rotate(-180deg);
        }

        .pre-auth-content {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .pre-auth-info {
            margin-bottom: 12px;
            padding: 8px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 3px;
        }

        .pre-auth-info p {
            margin: 0;
            font-size: 12px;
            line-height: 1.5;
            color: var(--vscode-descriptionForeground);
        }

        .pre-auth-info code {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 11px;
        }

        .pre-auth-credentials {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }

        .form-label {
            display: block;
            margin-bottom: 6px;
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .editor-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .tabs {
            display: flex;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editorGroupHeader-tabsBackground);
            padding: 0 16px;
        }

        .tab {
            padding: 10px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-size: 13px;
            transition: all 0.15s;
        }

        .tab:hover {
            background-color: var(--vscode-tab-hoverBackground);
        }

        .tab.active {
            border-bottom-color: var(--vscode-focusBorder);
            color: var(--vscode-tab-activeForeground);
        }

        .tab-content {
            flex: 1;
            display: none;
            flex-direction: column;
            overflow: hidden;
            padding: 16px;
        }

        .tab-content.active {
            display: flex;
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-label {
            display: block;
            margin-bottom: 6px;
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        textarea {
            width: 100%;
            min-height: 200px;
            resize: vertical;
            font-family: 'Consolas', 'Courier New', monospace;
        }

        .query-editor,
        .headers-editor,
        .variables-editor {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .query-param-row,
        .header-row,
        .variable-row {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .variables-info {
            padding: 12px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
            margin-bottom: 16px;
        }

        .variables-info p {
            margin: 4px 0;
            font-size: 13px;
            color: var(--vscode-foreground);
        }

        .variables-info code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }

        .variable-row {
            display: flex;
            gap: 8px;
            align-items: center;
            padding: 4px 0;
        }

        .variable-prefix {
            font-weight: 600;
            color: var(--vscode-symbolIcon-variableForeground, #4FC1FF);
            font-size: 14px;
        }

        .variable-equals {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .variable-name-input {
            flex: 0 0 200px;
            padding: 6px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-size: 13px;
        }

        .variable-name-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .variable-value-input {
            flex: 1;
            padding: 6px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-size: 13px;
        }

        .variable-value-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .query-param-row input[type="checkbox"] {
            width: 20px;
            height: 20px;
            cursor: pointer;
            flex-shrink: 0;
        }

        .query-param-row input[type="text"],
        .header-row input {
            flex: 1;
        }

        .btn-remove-header {
            background-color: transparent;
            color: var(--vscode-errorForeground);
            border: 1px solid var(--vscode-errorForeground);
            padding: 8px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .btn-remove-header:hover {
            background-color: var(--vscode-errorForeground);
            color: var(--vscode-button-foreground);
        }

        .btn-add-header {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 6px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            align-self: flex-start;
            margin-top: 8px;
        }

        .btn-add-header:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .response-section {
            display: flex;
            flex-direction: column;
            gap: 0;
            height: 100%;
            width: 100%;
        }

        .response-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background-color: var(--vscode-editorWidget-background);
            border-radius: 4px;
            flex-shrink: 0;
        }

        .response-status {
            font-size: 14px;
            font-weight: 600;
        }

        .status-success {
            color: #4caf50;
        }

        .status-error {
            color: #f44336;
        }

        .response-time {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .response-tabs {
            display: flex;
            border-bottom: 1px solid var(--vscode-panel-border);
            flex-shrink: 0;
            margin-top: 12px;
        }

        .response-tab {
            padding: 8px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-size: 12px;
        }

        .response-tab:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .response-tab.active {
            border-bottom-color: var(--vscode-focusBorder);
        }

        .response-content {
            flex: 1;
            overflow: auto;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 0;
            min-height: 0;
            width: 100%;
        }

        .response-body {
            display: none;
            width: 100%;
            height: 100%;
        }

        .response-body.active {
            display: block;
        }

        pre {
            margin: 0;
            padding: 12px;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            word-wrap: break-word;
            width: 100%;
            box-sizing: border-box;
        }

        pre code.hljs {
            padding: 0;
            background: transparent;
        }

        .hljs {
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .save-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 1000;
        }

        .new-request-group {
            margin-top: 8px;
            margin-left: 16px;
            display: flex;
            gap: 8px;
        }

        .save-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }



        #notificationContainer {
            position: fixed;
            top: 24px;
            right: 24px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 1000;
        }

        .notification {
            min-width: 260px;
            padding: 10px 14px;
            border-radius: 6px;
            background-color: var(--vscode-notifications-background, var(--vscode-editorHoverWidget-background));
            color: var(--vscode-notifications-foreground, var(--vscode-editorHoverWidget-foreground));
            border: 1px solid var(--vscode-notifications-border, var(--vscode-editorHoverWidget-border));
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
            font-size: 13px;
        }

        .notification-error {
            border-left: 4px solid var(--vscode-errorForeground);
        }

        .notification-info {
            border-left: 4px solid var(--vscode-inputOption-activeBorder);
        }

        .notification-success {
            border-left: 4px solid var(--vscode-terminal-ansiGreen, #3fb950);
        }

        .notification button {
            background: transparent;
            border: none;
            color: inherit;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .btn-import {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }

        .btn-import:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            animation: fadeIn 0.2s;
        }

        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .modal-content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s;
        }

        @keyframes slideIn {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .modal-header h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--vscode-foreground);
            padding: 0;
            width: 28px;
            height: 28px;
            border-radius: 4px;
        }

        .modal-close:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .modal-body {
            padding: 20px;
            overflow-y: auto;
        }

        .import-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .import-tab {
            padding: 8px 16px;
            border: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }

        .import-tab:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .import-tab.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-focusBorder);
        }

        .import-tab-content {
            display: none;
        }

        .import-tab-content.active {
            display: block;
        }

        .import-description {
            margin-bottom: 12px;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }

        #importFileInput {
            display: none;
        }

        .file-drop-zone {
            border: 2px dashed var(--vscode-panel-border);
            border-radius: 6px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .file-drop-zone:hover {
            border-color: var(--vscode-focusBorder);
            background-color: var(--vscode-list-hoverBackground);
        }

        .file-drop-zone.dragover {
            border-color: var(--vscode-focusBorder);
            background-color: var(--vscode-list-hoverBackground);
        }

        .file-drop-zone p {
            margin: 4px 0;
            color: var(--vscode-foreground);
        }

        .file-drop-hint {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        #importTextInput {
            width: 100%;
            min-height: 200px;
            padding: 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 12px;
            border-radius: 4px;
            resize: vertical;
        }

        #importTextInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }

        .btn-import-submit {
            margin-top: 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            width: 100%;
        }

        .btn-import-submit:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>`;
  }

  /**
   * Generates JavaScript code
   */
  private generateScript(requestsJson: string, configJson: string): string {
    return `<script>
        const vscode = acquireVsCodeApi();
        
        let requests = ${requestsJson};
        let currentRequestId = requests.length > 0 ? requests[0].id : null;
        let lastResponse = null;
        
        // Configuration state
        let config = null;
        let selectedEnvironment = '';
        let selectedUser = '';
        let selectedLocale = '';
        let selectedTimezone = '';
        
        // Global pre-auth configuration (shared across all requests)
        let globalPreAuthConfig = {
            enabled: false,
            curlCommand: '',
            responsePath: '',
            username: '',
            password: ''
        };

        hydrateGlobalPreAuthConfigFromRequests();

        // Initialize
        function init() {
            renderRequestList();
            if (currentRequestId) {
                selectRequest(currentRequestId);
            }
        }

        // Initialize config UI
        function initConfig(configData) {
            config = configData;
            
            if (!config || (!config.environments || config.environments.length === 0) &&
                (!config.users || config.users.length === 0) &&
                (!config.locales || config.locales.length === 0)) {
                // Hide config selectors if no config
                document.getElementById('configSelectors').style.display = 'none';
                return;
            }
            
            // Show config selectors
            document.getElementById('configSelectors').style.display = 'block';
            
            // Populate environment selector
            const envSelect = document.getElementById('environmentSelect');
            envSelect.innerHTML = '<option value="">No Environment</option>';
            if (config.environments) {
                config.environments.forEach(env => {
                    const option = document.createElement('option');
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
            const userSelect = document.getElementById('userSelect');
            userSelect.innerHTML = '<option value="">No User</option>';
            if (config.users) {
                config.users.forEach(user => {
                    const option = document.createElement('option');
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
            const localeSelect = document.getElementById('localeSelect');
            localeSelect.innerHTML = '<option value="">Default</option>';
            if (config.locales) {
                config.locales.forEach(locale => {
                    const option = document.createElement('option');
                    option.value = locale.locale;
                    option.textContent = \`\${locale.locale} (\${locale.timezone})\`;
                    localeSelect.appendChild(option);
                });
            }
            if (config.defaultLocale) {
                localeSelect.value = config.defaultLocale;
                selectedLocale = config.defaultLocale;
                // Find timezone for default locale
                const localeObj = config.locales.find(l => l.locale === config.defaultLocale);
                if (localeObj) {
                    selectedTimezone = localeObj.timezone;
                }
            }
        }

        // Change environment
        function changeEnvironment(envName) {
            selectedEnvironment = envName;
            vscode.postMessage({
                command: 'changeEnvironment',
                environment: envName
            });
        }

        // Change user
        function changeUser(userName) {
            selectedUser = userName;
            vscode.postMessage({
                command: 'changeUser',
                user: userName
            });
        }

        // Change locale
        function changeLocale() {
            const localeSelect = document.getElementById('localeSelect');
            selectedLocale = localeSelect.value;
            
            // Find timezone for selected locale
            if (config && config.locales) {
                const localeObj = config.locales.find(l => l.locale === selectedLocale);
                if (localeObj) {
                    selectedTimezone = localeObj.timezone;
                }
            }
            
            vscode.postMessage({
                command: 'changeLocale',
                locale: selectedLocale,
                timezone: selectedTimezone
            });
        }

        // Render request list
        function renderRequestList() {
            const list = document.getElementById('requestList');
            list.innerHTML = '';

            requests.forEach(req => {
                const item = document.createElement('div');
                item.className = 'request-item' + (req.id === currentRequestId ? ' active' : '');
                item.innerHTML = \`
                    <div class="request-info" onclick="selectRequest(\${req.id})">
                        <div class="request-method method-\${req.method}">\${req.method}</div>
                        <div class="request-name">\${escapeHtml(req.name)}</div>
                    </div>
                    <button class="btn-delete" onclick="deleteRequest(\${req.id}); event.stopPropagation();">Delete</button>
                \`;
                list.appendChild(item);
            });
        }

        // Select request
        function selectRequest(id) {
            currentRequestId = id;
            const request = requests.find(r => r.id === id);
            
            if (!request) return;

            // Update UI
            document.getElementById('requestName').value = request.name;
            document.getElementById('methodSelect').value = request.method;
            document.getElementById('bodyInput').value = request.body || '';
            document.getElementById('bodyTypeSelect').value = request.bodyType || 'text';

            // Initialize queryParams if not exists
            if (!request.queryParams) {
                request.queryParams = [];
            }

            // Build full URL with query params for display
            let displayUrl = request.url;
            if (request.queryParams && request.queryParams.length > 0) {
                const enabledParams = request.queryParams.filter(p => p.enabled);
                if (enabledParams.length > 0) {
                    const queryString = enabledParams
                        .map(p => \`\${smartEncodeURIComponent(p.key)}=\${smartEncodeURIComponent(p.value)}\`)
                        .join('&');
                    displayUrl = \`\${request.url}?\${queryString}\`;
                }
            }
            document.getElementById('urlInput').value = displayUrl;

            // Render query params
            renderQueryParams(request.queryParams);

            // Render headers
            renderHeaders(request.headers);

            // Render variables
            renderVariables(request.variables || {});
            
            // Render pre-auth config from global state
            renderPreAuth(globalPreAuthConfig);
            
            // Auto-populate from @PRE-AUTH if enabled and fields are empty
            if (globalPreAuthConfig.enabled && !globalPreAuthConfig.curlCommand) {
                autoPopulateFromPreAuthRequest();
            }

            // Update URL preview
            updateUrlPreview();

            // Update list
            renderRequestList();

            // Reset response
            lastResponse = null;
            document.getElementById('responseContainer').innerHTML = '<div class="empty-state"><p>No response yet. Send a request to see the response.</p></div>';
        }

        // Toggle pre-auth expand/collapse
        function togglePreAuthExpand() {
            const content = document.getElementById('preAuthContent');
            const arrow = document.getElementById('preAuthArrow');
            const isExpanded = content.style.display === 'block';
            
            content.style.display = isExpanded ? 'none' : 'block';
            arrow.classList.toggle('expanded', !isExpanded);
        }

        // Toggle pre-auth
        function togglePreAuth() {
            const enabled = document.getElementById('preAuthEnabled').checked;
            const content = document.getElementById('preAuthContent');
            const arrow = document.getElementById('preAuthArrow');
            
            if (enabled) {
                content.style.display = 'block';
                arrow.classList.add('expanded');
                
                // Try to auto-populate from @PRE-AUTH request
                autoPopulateFromPreAuthRequest();
            } else {
                content.style.display = 'none';
                arrow.classList.remove('expanded');
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
            document.getElementById('preAuthCurl').value = curlCommand;
            document.getElementById('preAuthUsername').value = '';
            document.getElementById('preAuthPassword').value = '';
            document.getElementById('preAuthPath').value = preAuthRequest.preAuth?.responsePath || '';
            
            // Update global config
            globalPreAuthConfig.curlCommand = curlCommand;
            globalPreAuthConfig.responsePath = preAuthRequest.preAuth?.responsePath || '';
        }

        // Render pre-auth configuration
        function renderPreAuth(preAuth) {
            const arrow = document.getElementById('preAuthArrow');
            document.getElementById('preAuthEnabled').checked = preAuth.enabled;
            document.getElementById('preAuthContent').style.display = preAuth.enabled ? 'block' : 'none';
            
            if (preAuth.enabled) {
                arrow.classList.add('expanded');
            } else {
                arrow.classList.remove('expanded');
            }
            
            document.getElementById('preAuthCurl').value = preAuth.curlCommand;
            document.getElementById('preAuthPath').value = preAuth.responsePath || '';
            document.getElementById('preAuthUsername').value = preAuth.username || '';
            document.getElementById('preAuthPassword').value = preAuth.password || '';
        }

        // Update pre-auth configuration
        function updatePreAuthConfig() {
            globalPreAuthConfig.enabled = document.getElementById('preAuthEnabled').checked;
            globalPreAuthConfig.curlCommand = document.getElementById('preAuthCurl').value;
            globalPreAuthConfig.responsePath = document.getElementById('preAuthPath').value;
            globalPreAuthConfig.username = document.getElementById('preAuthUsername').value;
            globalPreAuthConfig.password = document.getElementById('preAuthPassword').value;
        }

        // Render query params
        function renderQueryParams(queryParams) {
            const container = document.getElementById('queryEditor');
            container.innerHTML = '';

            queryParams.forEach(param => {
                addQueryParamRow(param.key, param.value, param.enabled);
            });

            // Add empty row for new query param
            if (queryParams.length === 0) {
                addQueryParamRow();
            }
        }

        // Add query param row
        function addQueryParamRow(key = '', value = '', enabled = true) {
            const container = document.getElementById('queryEditor');
            const row = document.createElement('div');
            row.className = 'query-param-row';
            row.innerHTML = \`
                <input type="checkbox" \${enabled ? 'checked' : ''} onchange="updateCurrentRequest()">
                <input type="text" placeholder="Parameter Name" value="\${escapeHtml(key)}" onchange="updateCurrentRequest()">
                <input type="text" placeholder="Parameter Value" value="\${escapeHtml(value)}" onchange="updateCurrentRequest()">
                <button class="btn-remove-header" onclick="this.parentElement.remove(); updateCurrentRequest();">✕</button>
            \`;
            container.appendChild(row);
        }

        // Render headers
        function renderHeaders(headers) {
            const container = document.getElementById('headersEditor');
            container.innerHTML = '';

            Object.entries(headers).forEach(([key, value]) => {
                addHeaderRow(key, value);
            });

            // Add empty row for new header
            if (Object.keys(headers).length === 0) {
                addHeaderRow();
            }
        }

        // Add header row
        function addHeaderRow(key = '', value = '') {
            const container = document.getElementById('headersEditor');
            const row = document.createElement('div');
            row.className = 'header-row';
            row.innerHTML = \`
                <input type="text" placeholder="Header Name" value="\${escapeHtml(key)}" onchange="updateCurrentRequest()">
                <input type="text" placeholder="Header Value" value="\${escapeHtml(value)}" onchange="updateCurrentRequest()">
                <button class="btn-remove-header" onclick="this.parentElement.remove(); updateCurrentRequest();">✕</button>
            \`;
            container.appendChild(row);
        }

        // Render variables
        function renderVariables(variables) {
            const container = document.getElementById('variablesEditor');
            container.innerHTML = '';

            const varEntries = Object.entries(variables);
            
            varEntries.forEach(([name, value]) => {
                addVariableRow(name, value);
            });

            // Add empty row for new variable
            if (varEntries.length === 0) {
                addVariableRow();
            }
        }

        // Add variable row
        function addVariableRow(name = '', value = '') {
            const container = document.getElementById('variablesEditor');
            const row = document.createElement('div');
            row.className = 'variable-row';
            
            row.innerHTML = \`
                <span class="variable-prefix">@</span>
                <input type="text" class="variable-name-input" placeholder="variableName" value="\${escapeHtml(name)}" onchange="updateCurrentRequest()">
                <span class="variable-equals">=</span>
                <input type="text" class="variable-value-input" placeholder="value" value="\${escapeHtml(value)}" onchange="updateCurrentRequest()">
                <button class="btn-remove-header" onclick="this.parentElement.remove(); updateCurrentRequest();">✕</button>
            \`;
            container.appendChild(row);
        }

        // Count variable usage in request
        function countVariableUsage(request, variableName) {
            if (!request) return 0;
            
            let count = 0;
            const pattern = new RegExp(\`{{\s*\${variableName}\s*}}\`, 'g');
            
            // Check URL
            if (request.url) {
                const matches = request.url.match(pattern);
                count += matches ? matches.length : 0;
            }
            
            // Check headers
            if (request.headers) {
                Object.values(request.headers).forEach(value => {
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
            const request = requests.find(r => r.id === currentRequestId);
            if (!request) return;

            request.name = document.getElementById('requestName').value;
            request.method = document.getElementById('methodSelect').value;
            request.body = document.getElementById('bodyInput').value;
            request.bodyType = document.getElementById('bodyTypeSelect').value;

            // Collect query params
            const queryParams = [];
            document.querySelectorAll('#queryEditor .query-param-row').forEach(row => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                const inputs = row.querySelectorAll('input[type="text"]');
                const key = inputs[0].value.trim();
                const value = inputs[1].value.trim();
                if (key) {
                    queryParams.push({
                        key: key,
                        value: value,
                        enabled: checkbox.checked
                    });
                }
            });
            request.queryParams = queryParams;

            // Collect headers
            const headers = {};
            document.querySelectorAll('#headersEditor .header-row').forEach(row => {
                const inputs = row.querySelectorAll('input');
                const key = inputs[0].value.trim();
                const value = inputs[1].value.trim();
                if (key) {
                    headers[key] = value;
                }
            });
            request.headers = headers;

            // Collect variables
            const variables = {};
            document.querySelectorAll('#variablesEditor .variable-row').forEach(row => {
                const nameInput = row.querySelector('.variable-name-input');
                const valueInput = row.querySelector('.variable-value-input');
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
            requests.forEach(req => {
                req.variables = variables;
            });

            // Build URL with query params
            request.url = buildUrlWithQueryParams();

            // Update URL input
            document.getElementById('urlInput').value = request.url;

            // Auto-set Content-Type if not specified
            updateContentTypeHeader(request);

            // Update URL preview
            updateUrlPreview();

            renderRequestList();
        }

        // Smart encode URI component that preserves variable templates
        function smartEncodeURIComponent(str) {
            if (!str) return '';
            
            // Replace variable templates with placeholders
            const variablePattern = /\\{\\{\\s*\\w+\\s*\\}\\}/g;
            const variables = [];
            let tempStr = str;
            
            // Extract and store variable templates
            let match;
            while ((match = variablePattern.exec(str)) !== null) {
                variables.push(match[0]);
            }
            
            // Replace variables with unique placeholders
            variables.forEach((variable, index) => {
                tempStr = tempStr.replace(variable, '__VAR_' + index + '__');
            });
            
            // Encode the string
            let encoded = encodeURIComponent(tempStr);
            
            // Restore variables
            variables.forEach((variable, index) => {
                encoded = encoded.replace('__VAR_' + index + '__', variable);
            });
            
            return encoded;
        }

        // Build URL with query params
        function buildUrlWithQueryParams() {
            const urlInput = document.getElementById('urlInput').value;
            let baseUrl = urlInput;

            // Remove existing query string from URL
            const questionMarkIndex = baseUrl.indexOf('?');
            if (questionMarkIndex !== -1) {
                baseUrl = baseUrl.substring(0, questionMarkIndex);
            }

            // Collect current query params from form
            const queryParams = [];
            document.querySelectorAll('#queryEditor .query-param-row').forEach(row => {
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
                .map(p => \`\${smartEncodeURIComponent(p.key)}=\${smartEncodeURIComponent(p.value)}\`)
                .join('&');

            return \`\${baseUrl}?\${queryString}\`;
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
                        enabled: true
                    });
                });
            } catch (e) {
                // Invalid URL, try to parse query string manually
                const questionMarkIndex = url.indexOf('?');
                if (questionMarkIndex !== -1) {
                    const queryString = url.substring(questionMarkIndex + 1);
                    const pairs = queryString.split('&');
                    pairs.forEach(pair => {
                        const [key, value] = pair.split('=');
                        if (key) {
                            queryParams.push({
                                key: decodeURIComponent(key),
                                value: decodeURIComponent(value || ''),
                                enabled: true
                            });
                        }
                    });
                }
            }
            return queryParams;
        }

        // Update URL preview with variable highlighting
        function updateUrlPreview() {
            const urlInput = document.getElementById('urlInput');
            const urlPreview = document.getElementById('urlPreview');
            const request = requests.find(r => r.id === currentRequestId);
            
            if (!request || !urlInput || !urlPreview) return;

            const url = urlInput.value;
            const variables = request.variables || {};
            
            // Find all variables in the URL
            const variablePattern = /{{(\s*\w+\s*)}}/g;
            let html = '';
            let lastIndex = 0;
            let match;
            
            while ((match = variablePattern.exec(url)) !== null) {
                const varName = match[1].trim();
                const varValue = variables[varName];
                
                // Add text before variable
                html += escapeHtml(url.substring(lastIndex, match.index));
                
                // Add highlighted variable with tooltip
                if (varValue !== undefined) {
                    html += \`<span class="variable-highlight">\${escapeHtml(match[0])}<span class="variable-tooltip">@\${escapeHtml(varName)} = \${escapeHtml(varValue)}</span></span>\`;
                } else {
                    html += \`<span class="variable-highlight" style="color: var(--vscode-errorForeground);">\${escapeHtml(match[0])}<span class="variable-tooltip">Variable not defined</span></span>\`;
                }
                
                lastIndex = variablePattern.lastIndex;
            }
            
            // Add remaining text
            html += escapeHtml(url.substring(lastIndex));
            
            urlPreview.innerHTML = html;
        }

        // Handle URL change
        function onUrlChange() {
            const request = requests.find(r => r.id === currentRequestId);
            if (!request) return;

            const url = document.getElementById('urlInput').value;
            
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
            const request = requests.find(r => r.id === currentRequestId);
            if (!request) return;
            
            const newBodyType = document.getElementById('bodyTypeSelect').value;
            request.bodyType = newBodyType;
            
            // Update Content-Type header when body type changes
            const contentTypeMap = {
                'json': 'application/json',
                'urlencoded': 'application/x-www-form-urlencoded',
                'xml': 'application/xml',
                'html': 'text/html',
                'javascript': 'application/javascript',
                'text': 'text/plain'
            };
            
            if (contentTypeMap[newBodyType] && request.body && request.body.trim()) {
                // Find and update existing Content-Type header (case-insensitive)
                const contentTypeKey = Object.keys(request.headers).find(
                    key => key.toLowerCase() === 'content-type'
                );
                
                if (contentTypeKey) {
                    request.headers[contentTypeKey] = contentTypeMap[newBodyType];
                } else {
                    request.headers['Content-Type'] = contentTypeMap[newBodyType];
                }
                
                // Re-render headers to show updated value
                renderRequest(request);
            }
            
            updateCurrentRequest();
        }

        // Auto-update Content-Type header
        function updateContentTypeHeader(request) {
            const bodyType = request.bodyType || 'text';
            const hasContentType = Object.keys(request.headers).some(
                key => key.toLowerCase() === 'content-type'
            );

            // If Content-Type not set manually and request body exists
            if (!hasContentType && request.body && request.body.trim()) {
                const contentTypeMap = {
                    'json': 'application/json',
                    'urlencoded': 'application/x-www-form-urlencoded',
                    'xml': 'application/xml',
                    'html': 'text/html',
                    'javascript': 'application/javascript',
                    'text': 'text/plain'
                };

                if (contentTypeMap[bodyType]) {
                    request.headers['Content-Type'] = contentTypeMap[bodyType];
                }
            }
        }

        // Add new request
        function addNewRequest() {
            // Get variables from the first request if available
            const existingVariables = requests.length > 0 ? (requests[0].variables || {}) : {};
            
            const newRequest = {
                id: Date.now() + Math.random(),
                name: 'New Request',
                method: 'GET',
                url: 'https://api.example.com',
                headers: {},
                queryParams: [],
                body: '',
                bodyType: 'text',
                variables: existingVariables
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
                    command: 'log',
                    text: 'Cannot delete the last request'
                });
                return;
            }

            const index = requests.findIndex(r => r.id === id);
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
            if (!text || !variables) return text;
            
            let result = text;
            Object.entries(variables).forEach(([name, value]) => {
                const pattern = new RegExp(\`{{\s*\${name}\s*}}\`, 'g');
                result = result.replace(pattern, value);
            });
            
            return result;
        }

        function showNotification(message, type = 'info') {
            const container = document.getElementById('notificationContainer');
            if (!container) {
                return;
            }

            const notification = document.createElement('div');
            notification.className = 'notification notification-' + type;

            const messageNode = document.createElement('span');
            messageNode.textContent = message;
            notification.appendChild(messageNode);

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.setAttribute('aria-label', 'Dismiss notification');
            closeButton.textContent = '×';
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
            
            const request = requests.find(r => r.id === currentRequestId);
            if (!request) return;

            const sendButton = document.getElementById('sendButton');
            sendButton.disabled = true;

            // Check if pre-auth is enabled (using global config)
            if (globalPreAuthConfig.enabled) {
                // Execute pre-auth request first
                sendButton.textContent = 'Authenticating...';
                
                try {
                    await executePreAuth(request, request.variables || {});
                } catch (error) {
                    console.error('Pre-auth error:', error);
                    showNotification('Pre-authentication failed: ' + error.message, 'error');
                    sendButton.disabled = false;
                    sendButton.textContent = 'Send';
                    return;
                }
            }

            // Create a copy of the request with variables replaced
            const processedRequest = {
                ...request,
                url: replaceVariables(request.url, request.variables),
                headers: {},
                body: replaceVariables(request.body, request.variables)
            };

            // Replace variables in headers
            Object.entries(request.headers).forEach(([key, value]) => {
                processedRequest.headers[key] = replaceVariables(value, request.variables);
            });

            // Validate URL
            if (!processedRequest.url || !processedRequest.url.startsWith('http')) {
                showNotification('Please enter a valid URL starting with http:// or https://', 'error');
                sendButton.disabled = false;
                sendButton.textContent = 'Send';
                return;
            }

            sendButton.textContent = 'Sending...';

            vscode.postMessage({
                command: 'sendRequest',
                request: processedRequest
            });

            // Switch to Response tab
            switchTab('response');
        }

        // Execute pre-auth request
        function executePreAuth(request, variables) {
            return new Promise((resolve, reject) => {
                if (!globalPreAuthConfig.curlCommand || !globalPreAuthConfig.responsePath) {
                    reject(new Error('Pre-auth configuration is incomplete'));
                    return;
                }

                console.log('Executing pre-auth with config:', {
                    curlCommand: globalPreAuthConfig.curlCommand,
                    responsePath: globalPreAuthConfig.responsePath,
                    hasUsername: !!globalPreAuthConfig.username,
                    hasPassword: !!globalPreAuthConfig.password,
                    variables: variables
                });

                // Store callback for handling response
                window.preAuthCallback = (success, authToken, error) => {
                    if (success) {
                        console.log('Pre-auth success, token:', authToken);
                        // Add @auth variable to request
                        if (!request.variables) {
                            request.variables = {};
                        }
                        request.variables['auth'] = authToken;
                        resolve();
                    } else {
                        console.error('Pre-auth failed:', error);
                        reject(new Error(error || 'Pre-authentication failed'));
                    }
                };

                // Send pre-auth request to extension
                vscode.postMessage({
                    command: 'executePreAuth',
                    preAuth: globalPreAuthConfig,
                    variables: variables,
                    requestId: request.id
                });
            });
        }

        // Export to cURL
        function exportToCurl() {
            updateCurrentRequest();
            
            const request = requests.find(r => r.id === currentRequestId);
            if (!request) return;

            vscode.postMessage({
                command: 'exportToCurl',
                request: request
            });
        }

        // Save all requests
        function saveAllRequests() {
            updateCurrentRequest();
            
            vscode.postMessage({
                command: 'saveRequests',
                requests: requests,
                preAuth: {
                    enabled: globalPreAuthConfig.enabled,
                    curlCommand: globalPreAuthConfig.curlCommand,
                    responsePath: globalPreAuthConfig.responsePath,
                    username: globalPreAuthConfig.username,
                    password: globalPreAuthConfig.password
                }
            });
        }

        function findPreAuthRequest() {
            return requests.find(r => r.isPreAuthRequest === true || (r.name && r.name.trim().toUpperCase() === '@PRE-AUTH'));
        }

        function hydrateGlobalPreAuthConfigFromRequests() {
            const preAuthRequest = findPreAuthRequest();
            if (!preAuthRequest) {
                return;
            }
            globalPreAuthConfig.enabled = true;
            globalPreAuthConfig.curlCommand = buildCurlCommandFromRequest(preAuthRequest);
            globalPreAuthConfig.responsePath = preAuthRequest.preAuth?.responsePath || '';
        }

        function buildCurlCommandFromRequest(preAuthRequest) {
            if (!preAuthRequest) {
                return '';
            }

            let curlCommand = \`curl -X \${preAuthRequest.method} \${preAuthRequest.url}\`;

            const headers = preAuthRequest.headers || {};
            for (const [key, value] of Object.entries(headers)) {
                if (key && value) {
                    curlCommand += \` -H '\${key}: \${value}'\`;
                }
            }

            if (preAuthRequest.body && preAuthRequest.body.trim()) {
                const sanitizedBody = replacePreAuthCredentials(preAuthRequest.body);
                // Remove all newlines and extra whitespace from body
                const cleanBody = sanitizedBody.replace(/\\r?\\n|\\r/g, '').replace(/\\s+/g, ' ').trim();
                curlCommand += \` -d '\${cleanBody}'\`;
            }

            return curlCommand;
        }

        function replacePreAuthCredentials(body) {
            let sanitized = body;
            
            // JSON format replacements
            const replacements = [
                { pattern: /"email"\s*:\s*"[^"]*"/gi, replacement: '"email": "{{username}}"' },
                { pattern: /"username"\s*:\s*"[^"]*"/gi, replacement: '"username": "{{username}}"' },
                { pattern: /"user"\s*:\s*"[^"]*"/gi, replacement: '"user": "{{username}}"' },
                { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password": "{{password}}"' },
                { pattern: /"pass"\s*:\s*"[^"]*"/gi, replacement: '"pass": "{{password}}"' }
            ];

            replacements.forEach(({ pattern, replacement }) => {
                sanitized = sanitized.replace(pattern, replacement);
            });

            // URL-encoded form data replacements
            sanitized = sanitized.replace(/\b(username|email|user)=([^&\s]*)/gi, '$1={{username}}');
            sanitized = sanitized.replace(/\b(password|pass)=([^&\s]*)/gi, '$1={{password}}');

            return sanitized;
        }

        // Switch tabs
        function switchTab(tabName) {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Activate selected tab
            document.querySelector(\`.tab[data-tab="\${tabName}"]\`).classList.add('active');
            document.getElementById(\`\${tabName}-tab\`).classList.add('active');
        }

        // Switch response tabs
        function switchResponseTab(tabName) {
            document.querySelectorAll('.response-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.response-body').forEach(body => {
                body.classList.remove('active');
            });

            document.querySelector(\`.response-tab[data-tab="\${tabName}"]\`).classList.add('active');
            document.getElementById(\`response-\${tabName}\`).classList.add('active');
        }

        // Escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Format JSON
        function formatJson(json) {
            try {
                if (typeof json === 'string') {
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
                if (typeof json === 'string') {
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
                const highlighted = hljs.highlight(formatted, { language: 'json' }).value;
                return highlighted;
            } catch (e) {
                return escapeHtml(typeof json === 'string' ? json : JSON.stringify(json));
            }
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'requestComplete':
                    handleRequestComplete(message.response);
                    break;
                case 'saveComplete':
                    if (message.success) {
                        const saveBtn = document.querySelector('.save-button');
                        const originalText = saveBtn.textContent;
                        saveBtn.textContent = '✓ Saved!';
                        setTimeout(() => {
                            saveBtn.textContent = originalText;
                        }, 2000);
                    }
                    break;
                case 'updateVariables':
                    handleVariablesUpdate(message.variables);
                    break;
            }
        });

        // Handle variables update from extension
        function handleVariablesUpdate(newVariables) {
            // Update current request's variables
            if (currentRequestId !== null) {
                const request = requests.find(r => r.id === currentRequestId);
                if (request) {
                    // Merge new variables with existing ones
                    request.variables = {
                        ...newVariables,
                        ...(request.variables || {})
                    };
                    
                    // Re-render variables tab
                    renderVariables(request.variables);
                }
            }
        }

        // Handle request complete
        function handleRequestComplete(response) {
            lastResponse = response;

            const sendButton = document.getElementById('sendButton');
            sendButton.disabled = false;
            sendButton.textContent = 'Send';

            // Render response
            const container = document.getElementById('responseContainer');
            const statusClass = response.isError || response.status >= 400 ? 'status-error' : 'status-success';

            container.innerHTML = \`
                <div class="response-section">
                    <div class="response-header">
                        <div class="response-status \${statusClass}">
                            Status: \${response.status} \${escapeHtml(response.statusText)}
                        </div>
                        <div class="response-time">
                            Time: \${response.duration}ms
                        </div>
                    </div>

                    <div class="response-tabs">
                        <div class="response-tab active" data-tab="body" onclick="switchResponseTab('body')">Body</div>
                        <div class="response-tab" data-tab="headers" onclick="switchResponseTab('headers')">Headers</div>
                    </div>

                    <div class="response-content">
                        <div class="response-body active" id="response-body">
                            <pre><code class="hljs language-json">\${formatAndHighlightJson(response.data)}</code></pre>
                        </div>
                        <div class="response-body" id="response-headers">
                            <pre><code class="hljs language-json">\${formatAndHighlightJson(response.headers)}</code></pre>
                        </div>
                    </div>
                </div>
            \`;
        }

        // Import modal functions
        function openImportModal() {
            const modal = document.getElementById('importModal');
            modal.classList.add('show');
        }

        function closeImportModal() {
            const modal = document.getElementById('importModal');
            modal.classList.remove('show');
            // Reset form
            document.getElementById('importTextInput').value = '';
            document.getElementById('importFileInput').value = '';
        }

        function switchImportTab(tab) {
            // Update tab buttons
            const tabs = document.querySelectorAll('.import-tab');
            tabs.forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');

            // Update tab content
            const fileTab = document.getElementById('import-file-tab');
            const textTab = document.getElementById('import-text-tab');
            
            if (tab === 'file') {
                fileTab.classList.add('active');
                textTab.classList.remove('active');
            } else {
                textTab.classList.add('active');
                fileTab.classList.remove('active');
            }
        }

        // File drop zone handling
        const dropZone = document.getElementById('fileDropZone');
        if (dropZone) {
            dropZone.addEventListener('click', () => {
                document.getElementById('importFileInput').click();
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                
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
            if (!file.name.endsWith('.json')) {
                vscode.postMessage({
                    command: 'log',
                    text: 'Please select a JSON file'
                });
                showNotification('Please select a JSON file', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                processImport(content);
            };
            reader.onerror = () => {
                showNotification('Failed to read file', 'error');
            };
            reader.readAsText(file);
        }

        function handleTextImport() {
            const content = document.getElementById('importTextInput').value.trim();
            if (!content) {
                showNotification('Please paste content to import', 'error');
                return;
            }
            processImport(content);
        }

        function processImport(content) {
            vscode.postMessage({
                command: 'importRequests',
                content: content
            });
        }

        // Handle import response from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.command === 'importComplete') {
                if (message.success) {
                    // Add imported requests to the list
                    if (message.requests && message.requests.length > 0) {
                        requests.push(...message.requests);
                        renderRequestList();
                        
                        // Select first imported request
                        selectRequest(message.requests[0].id);
                        showNotification('Successfully imported ' + message.requests.length + ' request(s)', 'success');
                        closeImportModal();
                        
                        vscode.postMessage({
                            command: 'log',
                            text: \`Successfully imported \${message.requests.length} request(s)\`
                        });
                    } else {
                        showNotification('Import completed but no requests were found.', 'info');
                    }
                } else {
                    showNotification('Import failed: ' + (message.error || 'Unknown error'), 'error');
                }
            } else if (message.command === 'preAuthComplete') {
                // Handle pre-auth response
                if (window.preAuthCallback) {
                    window.preAuthCallback(message.success, message.authToken, message.error);
                    delete window.preAuthCallback;
                }
            }
        });

        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('importModal');
                if (modal.classList.contains('show')) {
                    closeImportModal();
                }
            }
        });

        // Close modal when clicking outside
        document.getElementById('importModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'importModal') {
                closeImportModal();
            }
        });

        // Initialize on load
        const initialConfig = ${configJson};
        initConfig(initialConfig);
        init();
    </script>`;
  }
}
