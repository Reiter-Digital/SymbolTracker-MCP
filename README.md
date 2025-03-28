# MCP DevDocs Server

A custom MCP (Model Context Protocol) server that allows Claude/Windsurf to query structured, real-time documentation about a codebase. The goal is to reduce hallucinations in AI-generated code by providing accurate, up-to-date metadata about the project being edited.

## Features

- **Tool: `get_doc_for_file`** – returns a summary of a specific file, extracting:
  - Functions and their parameters
  - Classes with methods and properties
  - Interfaces and type definitions
  - Potential API routes (Express/NextJS style)
  
- **TypeScript Parsing** – Uses [ts-morph](https://ts-morph.com/) for robust TypeScript AST parsing

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

Extracts documentation information from a TypeScript file.

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

- File watchers to auto-update documentation
- Support for additional languages (JavaScript, Python, etc.)
- Search interface to list all functions, routes, or types in the project
- Markdown or Docusaurus export for generating documentation sites

## License

MIT
