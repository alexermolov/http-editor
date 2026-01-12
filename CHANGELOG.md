# Change Log

All notable changes to the "HTTP Request Editor" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Variables tab now automatically regenerates when Environment, User, or Locale is changed
- Config variables are now properly merged with request variables and displayed in the Variables tab

## [1.0.0] - 2025-11-18

### Added
- Initial release of HTTP Request Editor
- Request list sidebar for viewing all HTTP requests from `.http` files
- Rich editor interface for editing HTTP requests
- Support for multiple HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- Header management with add/remove functionality
- Multiple body types support:
  - JSON with syntax highlighting
  - URL-encoded form data
  - XML/HTML
  - JavaScript
  - Plain text
- HTTP request execution with axios
- Response viewer with:
  - Status code and text display
  - Response headers inspection
  - Formatted response body with syntax highlighting
- cURL export functionality (Windows and Unix compatible)
- Auto-save functionality to persist changes back to `.http` files
- Context menu integration for `.http` files
- VS Code theme integration
- Request creation and deletion
- HTTP request parser for `.http` file format

### Features
- 📋 Organized request list view
- ✏️ Intuitive request editing interface
- 🎯 Support for various content types
- 🚀 Real-time request execution
- 📊 Comprehensive response inspection
- 📋 One-click cURL export
- 💾 Seamless file synchronization
- 🎨 Theme-aware UI

[1.0.0]: https://github.com/alexermolov/http-editor/releases/tag/v1.0.0
