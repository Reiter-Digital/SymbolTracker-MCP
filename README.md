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

- **Freshness Tracking** – Automatically detects file changes and updates the registry

- **Multi-Language Support**:
  - TypeScript – Uses [ts-morph](https://ts-morph.com/) for robust TypeScript AST parsing
  - JavaScript – Full support for JS files including JSDoc comments
  - Python – Improved support using Tree-sitter: extracts functions, classes, methods (inc. params, visibility), docstrings, and basic routes.

- **Persistence** – Symbol registry is saved to disk for faster startup

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
