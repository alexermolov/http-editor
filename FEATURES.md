# HTTP Editor - New Features

This document describes the new environment, user profile, and locale/timezone features added to HTTP Editor.

## Features

### 1. Environment Variables

Define multiple environments (local, staging, production) with different configurations. Switch between environments seamlessly in the UI.

**Configuration File**: `.http-editor.config.json` (place in workspace root)

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
      "name": "staging",
      "variables": {
        "host": "staging.mydomain.com",
        "protocol": "https",
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
  ]
}
```

**Usage in .http files**:
```http
### Get Users
GET {{protocol}}://{{host}}/{{apiVersion}}/users
```

### 2. Multiple User Profiles

Define multiple testing accounts with different credentials. Great for testing with different user roles and permissions.

**Configuration**:
```json
{
  "users": [
    {
      "name": "admin",
      "username": "admin@example.com",
      "password": "admin123",
      "token": "Bearer admin-token-here",
      "variables": {
        "userId": "1",
        "role": "admin"
      }
    },
    {
      "name": "testUser",
      "username": "test@example.com",
      "password": "test123",
      "token": "Bearer test-token-here",
      "variables": {
        "userId": "2",
        "role": "user"
      }
    }
  ]
}
```

**Usage in .http files**:
```http
### Get User Profile
GET {{protocol}}://{{host}}/{{apiVersion}}/users/{{userId}}
Authorization: {{token}}
```

User credentials are also available for `@PRE-AUTH` requests using `{{username}}` and `{{password}}` variables.

### 3. Locale and Timezone

Test your API with different locales and timezones. Automatically sends `Accept-Language` and `X-Timezone` headers.

**Configuration**:
```json
{
  "locales": [
    {
      "locale": "en-US",
      "timezone": "America/New_York"
    },
    {
      "locale": "ja-JP",
      "timezone": "Asia/Tokyo"
    }
  ]
}
```

When you select a locale, the HTTP client will automatically include:
- `Accept-Language: en-US` header
- `X-Timezone: America/New_York` header

## Getting Started

1. **Create a configuration file**:
   - Run command: `HTTP Editor: Create Example Config File`
   - Or manually create `.http-editor.config.json` in your workspace root

2. **Configure your environments, users, and locales** in the config file

3. **Open any .http file** with HTTP Editor

4. **Use the dropdowns** at the top of the sidebar to select:
   - Environment (local, staging, production)
   - User profile (admin, testUser, etc.)
   - Locale/Timezone

5. **Use variables** in your HTTP requests:
   - Environment variables: `{{host}}`, `{{protocol}}`, etc.
   - User variables: `{{username}}`, `{{password}}`, `{{token}}`, `{{userId}}`, etc.
   - Custom variables from config

## Example Workflow

1. Create `.http-editor.config.json`:
```json
{
  "environments": [
    {"name": "local", "variables": {"host": "localhost:3000", "protocol": "http"}},
    {"name": "production", "variables": {"host": "api.mydomain.com", "protocol": "https"}}
  ],
  "users": [
    {"name": "admin", "token": "Bearer admin-token", "variables": {"role": "admin"}},
    {"name": "user", "token": "Bearer user-token", "variables": {"role": "user"}}
  ],
  "locales": [
    {"locale": "en-US", "timezone": "America/New_York"},
    {"locale": "ja-JP", "timezone": "Asia/Tokyo"}
  ],
  "defaultEnvironment": "local",
  "defaultUser": "admin",
  "defaultLocale": "en-US"
}
```

2. Create `api-test.http`:
```http
### Get Users
GET {{protocol}}://{{host}}/api/users
Authorization: {{token}}
Accept: application/json

### Create User
POST {{protocol}}://{{host}}/api/users
Authorization: {{token}}
Content-Type: application/json

{
  "username": "newuser",
  "role": "{{role}}"
}
```

3. Switch environments/users/locales using the dropdowns in the UI
4. All variables automatically resolve based on your selection

## VS Code Settings

You can also configure defaults in VS Code settings:

- `httpEditor.defaultEnvironment`: Default environment to use
- `httpEditor.defaultUser`: Default user profile to use
- `httpEditor.defaultLocale`: Default locale for requests

## Notes

- Environment variables take precedence over user variables if there are naming conflicts
- File-level variables (defined with `@variable = value`) take precedence over config variables
- The config file is loaded from the workspace root
- Changes to environment/user/locale selections apply immediately to all requests
