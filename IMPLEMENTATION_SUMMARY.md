# HTTP Editor - Environment & Configuration Features Implementation

## Summary

Successfully implemented three major feature requests:

### 1. Configuration File & Environment Variables ✅
- **What**: Support for multiple environments (local, staging, production) with different URLs and variables
- **How**: `.http-editor.config.json` file in workspace root
- **Usage**: Use `{{host}}`, `{{protocol}}`, `{{apiVersion}}` etc. in .http files
- **Example**:
  ```http
  GET {{protocol}}://{{host}}/{{apiVersion}}/users
  ```

### 2. Multiple User Profiles ✅
- **What**: Test with multiple user accounts (admin, testUser, guest, etc.)
- **How**: Define users in config with credentials and custom variables
- **Usage**: Access `{{username}}`, `{{password}}`, `{{token}}`, `{{userId}}`, `{{role}}` in requests
- **Integration**: Works seamlessly with existing `@PRE-AUTH` feature

### 3. Selectable Locale/Timezone ✅
- **What**: Test APIs with different locales and timezones
- **How**: Define locale/timezone pairs in config, select from dropdown
- **Effect**: Automatically adds `Accept-Language` and `X-Timezone` headers to requests

## Files Modified

### Core Implementation
1. **src/types/index.ts** - Added types for `Environment`, `UserProfile`, `LocaleSettings`, `ExtensionConfig`, and message types
2. **src/config/configManager.ts** (NEW) - Configuration file manager with load/save/merge functionality
3. **src/parser/httpParser.ts** - Added support for external variables from config
4. **src/http/httpClient.ts** - Added locale/timezone header injection
5. **src/webview/webviewProvider.ts** - Integrated config loading and variable management
6. **src/webview/webviewContent.ts** - Added UI dropdowns for environment/user/locale selection
7. **src/extension.ts** - Added command to create example config file
8. **package.json** - Added configuration settings and new command

### Documentation & Examples
9. **.http-editor.config.example.json** (NEW) - Complete example configuration
10. **FEATURES.md** (NEW) - Comprehensive feature documentation
11. **test/test-environments.http** (NEW) - Example .http file using config variables

## How It Works

### Configuration Loading
1. When opening a .http file, the extension loads `.http-editor.config.json` from workspace root
2. Default environment, user, and locale are applied from config or VS Code settings
3. Variables are merged: environment vars + user vars, with user vars taking precedence

### Variable Resolution
Priority order (highest to lowest):
1. File-level variables (`@variable = value` in .http file)
2. User variables from selected user profile
3. Environment variables from selected environment

### UI Integration
- Dropdown selectors appear in sidebar when config file exists
- Changing environment/user immediately updates all variables
- Changing locale immediately updates HTTP headers for all requests

### Request Headers
When locale/timezone are selected, every request automatically includes:
```
Accept-Language: en-US
X-Timezone: America/New_York
```

## Getting Started

### 1. Create Config File
Run VS Code command:
```
HTTP Editor: Create Example Config File
```

### 2. Customize Config
Edit `.http-editor.config.json`:
```json
{
  "environments": [
    {
      "name": "local",
      "variables": {
        "host": "localhost:3000",
        "protocol": "http",
        "apiVersion": "v1"
      }
    },
    {
      "name": "production",
      "variables": {
        "host": "api.mydomain.com",
        "protocol": "https",
        "apiVersion": "v1"
      }
    }
  ],
  "users": [
    {
      "name": "admin",
      "token": "Bearer admin-token",
      "variables": {
        "role": "admin"
      }
    }
  ],
  "locales": [
    {
      "locale": "en-US",
      "timezone": "America/New_York"
    }
  ],
  "defaultEnvironment": "local",
  "defaultUser": "admin",
  "defaultLocale": "en-US"
}
```

### 3. Use Variables in .http Files
```http
### Get Users
GET {{protocol}}://{{host}}/{{apiVersion}}/users
Authorization: {{token}}
Accept: application/json

### Create User
POST {{protocol}}://{{host}}/{{apiVersion}}/users
Authorization: {{token}}
Content-Type: application/json

{
  "username": "newuser",
  "role": "{{role}}"
}
```

### 4. Switch Environments/Users/Locales
Use the dropdown selectors at the top of the sidebar in the HTTP Editor.

## VS Code Settings

Configure defaults in VS Code settings:
```json
{
  "httpEditor.defaultEnvironment": "local",
  "httpEditor.defaultUser": "admin",
  "httpEditor.defaultLocale": "en-US"
}
```

## Technical Details

### ConfigManager Class
- **Location**: `src/config/configManager.ts`
- **Methods**:
  - `load()` - Loads config from workspace root
  - `save(config)` - Saves config to workspace root
  - `getConfig()` - Returns current configuration
  - `getEnvironment(name)` - Get environment by name
  - `getUser(name)` - Get user profile by name
  - `getLocale(locale)` - Get locale settings
  - `getMergedVariables(env, user)` - Merge environment and user variables
  - `createExampleConfig()` - Create example config file

### Variable Merging Strategy
```typescript
const variables: Record<string, string> = {};

// 1. Add environment variables
Object.assign(variables, environment.variables);

// 2. Add user variables (overrides environment)
if (user.username) variables.username = user.username;
if (user.password) variables.password = user.password;
if (user.token) variables.token = user.token;
Object.assign(variables, user.variables);

// 3. Parser merges with file variables (file variables take precedence)
const fileVariables = { ...configVariables, ...fileDefinedVariables };
```

### Message Flow
1. **User selects environment** → `changeEnvironment` message → WebviewProvider → ConfigManager → Parser → Variables updated
2. **User selects user** → `changeUser` message → WebviewProvider → ConfigManager → Parser → Variables updated
3. **User selects locale** → `changeLocale` message → WebviewProvider → HttpClient → Headers updated

## Benefits

1. **Single Configuration**: Define once, use across all .http files in workspace
2. **Environment Safety**: Easy switching between local/staging/production
3. **Multi-User Testing**: Test with different user roles and permissions
4. **Internationalization**: Test API behavior with different locales
5. **Time Zone Testing**: Ensure proper handling of timezone-aware data
6. **Credential Security**: Credentials stored in local config file, not in .http files
7. **Team Sharing**: Share .http files without credentials, each developer has own config

## Future Enhancements (Potential)

- [ ] Environment-specific timeout values
- [ ] Global headers per environment
- [ ] Environment variables encryption
- [ ] Import/export config between projects
- [ ] Config validation and schema
- [ ] Multiple config files support
- [ ] Per-request environment override

## Testing Recommendations

1. **Test Environment Switching**: 
   - Create requests with `{{host}}` variable
   - Switch between local/staging/production
   - Verify URL changes correctly

2. **Test User Switching**:
   - Create requests with `{{token}}` variable
   - Switch between different user profiles
   - Verify authorization headers change

3. **Test Locale**:
   - Select different locales
   - Check request headers include correct `Accept-Language`
   - Verify `X-Timezone` header is present

4. **Test @PRE-AUTH with Users**:
   - Create pre-auth request with `{{username}}` and `{{password}}`
   - Switch users
   - Verify credentials update correctly

## Notes

- Config file must be named exactly `.http-editor.config.json`
- Config file must be in workspace root (not in subdirectories)
- Changes to config file require reloading the .http file
- Environment/user/locale selections persist only for current session
- All config fields are optional except environment/user/locale names
