import { HttpRequest, ExtensionConfig } from "../types";

/**
 * HTML content generator for WebView
 */
export class WebviewContentGenerator {
  /**
   * Generates HTML content for WebView
   */
  public generate(
    requests: HttpRequest[],
    filePath: string,
    config?: ExtensionConfig,
    webviewResources?: {
      stylesUri?: string;
      scriptUri?: string;
      cspSource?: string;
    }
  ): string {
    const initialStateJson = JSON.stringify({
      requests,
      config: config || null,
    });
    const stylesUri = webviewResources?.stylesUri || "";
    const scriptUri = webviewResources?.scriptUri || "";
    const cspSource = webviewResources?.cspSource || "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${cspSource} https://cdnjs.cloudflare.com; script-src 'unsafe-inline' ${cspSource} https://cdnjs.cloudflare.com; img-src https: data:;">
    <title>HTTP Editor</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
        ${stylesUri ? `<link rel="stylesheet" href="${stylesUri}">` : ""}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/xml.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js"></script>
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
                        <input type="text" id="urlInput" placeholder="https://api.example.com/endpoint" onchange="onUrlChange()">
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
                        <div class="body-editor-container">
                            <pre class="body-highlight-layer"><code id="bodyHighlight" class="hljs"></code></pre>
                            <textarea id="bodyInput" placeholder="Enter request body" oninput="updateCurrentRequest(); updateBodyHighlight()" onscroll="syncBodyScroll()"></textarea>
                        </div>
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

        ${this.generateScript(initialStateJson, scriptUri)}
</body>
</html>`;
  }

  /**
   * Generates JavaScript bootstrap (external)
   */
  private generateScript(initialStateJson: string, scriptUri: string): string {
    return `
    <script id="http-editor-initial-state" type="application/json">${initialStateJson}</script>
    ${scriptUri ? `<script src="${scriptUri}"></script>` : ""}`;
  }
}
