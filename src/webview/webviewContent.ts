import { HttpRequest } from "../types";

/**
 * HTML content generator for WebView
 */
export class WebviewContentGenerator {
  /**
   * Generates HTML content for WebView
   */
  public generate(requests: HttpRequest[], filePath: string): string {
    const requestsJson = JSON.stringify(requests);

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
            <div class="request-list" id="requestList"></div>
        </div>

        <div class="main-content">
            <div class="new-request-group">
                <button class="btn-import" onclick="openImportModal()" title="Import Postman Collection or cURL">📥 Import</button>
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

    ${this.generateScript(requestsJson)}
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
            flex: 1;
        }

        .url-input-wrapper {
            position: relative;
            flex: 1;
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

        #urlInput {
            position: relative;
            z-index: 1;
            background-color: transparent;
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
            background-color: var(--vscode-input-background);
            padding: 8px;
            border-radius: 4px;
            border: 1px solid var(--vscode-input-border);
        }

        .variable-row .variable-name {
            font-weight: 600;
            color: var(--vscode-symbolIcon-variableForeground, #4FC1FF);
            flex: 0 0 200px;
        }

        .variable-row .variable-value {
            flex: 1;
            color: var(--vscode-foreground);
            word-break: break-all;
        }

        .variable-usage {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
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

        /* Modal styles */
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
  private generateScript(requestsJson: string): string {
    return `<script>
        const vscode = acquireVsCodeApi();
        
        let requests = ${requestsJson};
        let currentRequestId = requests.length > 0 ? requests[0].id : null;
        let lastResponse = null;

        // Initialize
        function init() {
            renderRequestList();
            if (currentRequestId) {
                selectRequest(currentRequestId);
            }
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
            document.getElementById('urlInput').value = request.url;
            document.getElementById('bodyInput').value = request.body || '';
            document.getElementById('bodyTypeSelect').value = request.bodyType || 'text';

            // Initialize queryParams if not exists
            if (!request.queryParams) {
                request.queryParams = [];
            }

            // Render query params
            renderQueryParams(request.queryParams);

            // Render headers
            renderHeaders(request.headers);

            // Render variables
            renderVariables(request.variables || {});

            // Update URL preview
            updateUrlPreview();

            // Update list
            renderRequestList();

            // Reset response
            lastResponse = null;
            document.getElementById('responseContainer').innerHTML = '<div class="empty-state"><p>No response yet. Send a request to see the response.</p></div>';
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
            
            if (varEntries.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No variables defined. Add variables in the .http file using @variableName = value</p></div>';
                return;
            }

            varEntries.forEach(([name, value]) => {
                const row = document.createElement('div');
                row.className = 'variable-row';
                
                // Find variable usage in current request
                const request = requests.find(r => r.id === currentRequestId);
                const usageCount = countVariableUsage(request, name);
                const usageText = usageCount > 0 ? \`Used \${usageCount} time(s) in this request\` : 'Not used in this request';
                
                row.innerHTML = \`
                    <div class="variable-name">@\${escapeHtml(name)}</div>
                    <div class="variable-value">\${escapeHtml(value)}</div>
                    <div class="variable-usage">\${usageText}</div>
                \`;
                container.appendChild(row);
            });
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
                .map(p => \`\${encodeURIComponent(p.key)}=\${encodeURIComponent(p.value)}\`)
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

        // Send request
        function sendRequest() {
            updateCurrentRequest();
            
            const request = requests.find(r => r.id === currentRequestId);
            if (!request) return;

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
                alert('Please enter a valid URL starting with http:// or https://');
                return;
            }

            const sendButton = document.getElementById('sendButton');
            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';

            vscode.postMessage({
                command: 'sendRequest',
                request: processedRequest
            });

            // Switch to Response tab
            switchTab('response');
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
                requests: requests
            });
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
            }
        });

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
                alert('Please select a JSON file');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                processImport(content);
            };
            reader.onerror = () => {
                alert('Failed to read file');
            };
            reader.readAsText(file);
        }

        function handleTextImport() {
            const content = document.getElementById('importTextInput').value.trim();
            if (!content) {
                alert('Please paste content to import');
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
                        
                        closeImportModal();
                        
                        vscode.postMessage({
                            command: 'log',
                            text: \`Successfully imported \${message.requests.length} request(s)\`
                        });
                    }
                } else {
                    alert(\`Import failed: \${message.error || 'Unknown error'}\`);
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
        init();
    </script>`;
  }
}
