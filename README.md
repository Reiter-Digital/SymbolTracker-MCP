# MCP DevDocs Server

A custom MCP (Model Context Protocol) server that allows Claude/Windsurf to query structured, real-time documentation about a codebase. The goal is to reduce hallucinations in AI-generated code by providing accurate, up-to-date metadata about the project being edited.

⚡ **Now with real-time symbol tracking and multi-language support!**

## Features

### Code Intelligence Tools

- **`get_doc_for_file`** – Returns detailed documentation for a specific file, extracting:
  - Functions and their parameters
  - Classes with methods and properties
  - Interfaces and type definitions
  - Potential API routes (Express/NextJS style)

- **`search_project_symbols`** – Search for symbols (functions, classes, etc.) across the entire project

- **`autocomplete_symbol`** – Get completion suggestions for partial symbol names

- **`get_doc_for_symbol`** – Get detailed documentation for a specific symbol by name

- **`find_usages`** – Find all references to a specific symbol across the codebase

- **`refresh_registry`** – Explicitly refresh the symbol registry (normally happens automatically)

### Core Features

- **Symbol Registry** – Tracks all functions, classes, and types across your codebase

- **Freshness Tracking** – Automatically detects file changes via watchers. When a file is modified, it's re-parsed, and its *entire* set of previous symbols are removed from the registry before adding the newly found symbols. This ensures additions, modifications, and deletions within a file are accurately reflected. Manual refresh is also available via `refresh_registry`.

- **Multi-Language Support**:
  - TypeScript – Uses [ts-morph](https://ts-morph.com/) for robust TypeScript AST parsing
  - JavaScript – Full support for JS files including JSDoc comments
  - Python – Improved support using Tree-sitter: extracts functions, classes, methods (inc. params, visibility), docstrings, and basic routes.
  - JSX/TSX (React) – Planned
  - HTML/CSS/SCSS – Planned
  - Rust – Planned
  - Go – Planned
  - Java – Planned
  - Swift – Planned
  - Dart (Flutter) – Planned

- **Persistence** – Symbol registry is saved to disk for faster startup

### Configuration (`mcpconfig.json`)

You can customize file scanning behavior by creating an `mcpconfig.json` file in your project root. It allows you to specify include/exclude patterns for file extensions, directories, and specific files. If the file doesn't exist, default settings are used.

**Example `mcpconfig.json`:**

```json
{
  "include": {
    "extensions": ["ts", "js", "tsx", "jsx", "py"],
    "directories": ["src", "tests"],
    "files": []
  },
  "exclude": {
    "extensions": [],
    "directories": ["node_modules", "dist", "backup", ".git"],
    "files": [".*", "*.snap", "*.log", "*.lock", "Dockerfile", "jest.config.js", "tsconfig.json"]
  }
}
```

### Planned Features

- **`summarize_project` Tool** – Generate a high-level overview of the project structure, including key classes, functions, and routes. (Planned)
- **Enhanced Symbol Lookup** – Improve `get_doc_for_symbol` and `find_usages` to handle qualified names like `ClassName.methodName` more effectively. (Planned)
- **Configuration File Integration** – Fully integrate `mcpconfig.json` to control file scanning. (In Progress)
- **More Robust Route Detection** – Support for Flask Blueprints, FastAPI routers, and other common patterns. (Planned)
- **Test Coverage Expansion** – Add more granular tests for specific language features and edge cases. (Ongoing)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-devdocs.git
cd mcp-devdocs

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

The MCP DevDocs Server works as a command-line tool that accepts JSON input via stdin and returns JSON output via stdout.

### Running the Server

```bash
npm start
```

Or, if you want to run it directly:

```bash
node dist/index.js
```

### API

#### get_doc_for_file

Extracts documentation information from a file.

**Input**:
```json
{
  "tool": "get_doc_for_file",
  "input": { 
    "file": "path/to/your/file.ts" 
  }
}
```

**Output**:
```json
{
  "filePath": "path/to/your/file.ts",
  "functions": [
    {
      "name": "exampleFunction",
      "params": ["param1", "param2"],
      "returnType": "string",
      "description": "Example function that does something",
      "exported": true
    }
  ],
  "classes": [
    {
      "name": "ExampleClass",
      "description": "A class that demonstrates something",
      "exported": true,
      "methods": [
        {
          "name": "exampleMethod",
          "params": ["param1"],
          "returnType": "void",
          "description": "Example method",
          "visibility": "public"
        }
      ],
      "properties": [
        {
          "name": "exampleProperty",
          "type": "string",
          "description": "An example property",
          "visibility": "private"
        }
      ]
    }
  ],
  "interfaces": [...],
  "typeAliases": [...],
  "routes": [...]
}
```

#### search_project_symbols

Search for symbols across the project.

**Input**:
```json
{
  "tool": "search_project_symbols",
  "input": { 
    "query": "user",
    "type": "class"
  }
}
```

**Output**:
```json
{
  "results": [
    {
      "name": "UserService",
      "type": "class",
      "file": "/path/to/services/user.ts",
      "description": "Service for managing users",
      "signature": "class UserService",
      "exported": true
    },
    {
      "name": "UserController",
      "type": "class",
      "file": "/path/to/controllers/user.ts",
      "description": "Controller for user-related endpoints",
      "signature": "class UserController",
      "exported": true
    }
  ]
}
```

#### autocomplete_symbol

Get completion suggestions for symbol names.

**Input**:
```json
{
  "tool": "autocomplete_symbol",
  "input": { 
    "prefix": "user",
    "type": "function"
  }
}
```

**Output**:
```json
{
  "completions": [
    {
      "name": "getUserById",
      "type": "function",
      "file": "/path/to/services/user.ts",
      "description": "Gets a user by their ID"
    },
    {
      "name": "getUserProfile",
      "type": "function",
      "file": "/path/to/services/user.ts",
      "description": "Gets a user's profile information"
    }
  ]
}
```

#### get_doc_for_symbol

Get detailed documentation for a specific symbol.

**Input**:
```json
{
  "tool": "get_doc_for_symbol",
  "input": { 
    "symbol": "UserService",
    "type": "class"
  }
}
```

**Output**:
```json
{
  "found": true,
  "symbol": {
    "name": "UserService",
    "type": "class",
    "file": "/path/to/services/user.ts",
    "description": "Service for managing users",
    "signature": "class UserService",
    "exported": true,
    "methods": [
      {
        "name": "getUserById",
        "params": ["id"],
        "returnType": "User",
        "description": "Gets a user by their ID",
        "visibility": "public"
      }
    ],
    "properties": [
      {
        "name": "repository",
        "type": "UserRepository",
        "description": "User repository instance",
        "visibility": "private"
      }
    ]
  }
}
```

#### find_usages

Find all references to a specific symbol in the codebase.

**Input**:
```json
{
  "tool": "find_usages",
  "input": { 
    "symbol": "getUserById",
    "type": "function"
  }
}
```

**Output**:
```json
{
  "symbol": "getUserById",
  "type": "function",
  "usages": [
    {
      "file": "/path/to/controllers/user.ts",
      "line": 15,
      "column": 22,
      "context": "const user = await userService.getUserById(id);"
    },
    {
      "file": "/path/to/routes/user.ts",
      "line": 30,
      "column": 24,
      "context": "router.get('/:id', async (req, res) => { const user = await getUserById(req.params.id); });"
    }
  ],
  "totalFound": 2,
  "limitReached": false
}
```

#### refresh_registry

Explicitly refresh the symbol registry.

**Input**:
```json
{
  "tool": "refresh_registry",
  "input": { 
    "fullScan": true
  }
}
```

**Output**:
```json
{
  "refreshed": true,
  "filesProcessed": 25,
  "filesRemoved": 2,
  "symbols": 342
}
```

## Windsurf Configuration

To use this MCP server with Windsurf, add the following to your Windsurf configuration:

```json
"mcpServers": {
  "devdocs": {
    "command": "node",
    "args": ["path/to/mcp-devdocs/dist/index.js"]
  }
}
```

## Docker Support (Optional)

You can build and run this MCP server using Docker:

```bash
# Build the Docker image
docker build -t mcp/devdocs .

# Run the container
docker run --rm -i mcp/devdocs
```

## Development

For development, you can use the following commands:

```bash
# Run in development mode with hot reloading
npm run dev

# Run tests
npm test
```

## Future Ideas

- Support for more languages (Go, Rust, Java, C/C++, etc.)
- Integration with static analysis tools for more detailed insights
- Enhanced JSDoc/docstring parsing for better documentation extraction
- Markdown or Docusaurus export for generating documentation sites
- GraphQL or REST API for accessing documentation programmatically
- Visualization tools for code dependencies and relationships
- Performance optimizations for very large codebases

## License

MIT

## TL;DR

This project provides a set of tools to analyze your codebase (TypeScript, JavaScript, Python initially) and build a persistent registry of symbols (functions, classes, etc.). It includes features for searching symbols, getting documentation, finding usages, and automatically keeping the registry up-to-date as you code. It aims to be a foundation for various code intelligence features.
