/**
 * Example file showing how to use the MCP DevDocs Server
 * 
 * This demonstrates how Claude/Windsurf can interact with the MCP server
 * to get structured documentation about files in a codebase.
 */

// In Claude, you would use the MCP protocol to make this request:
const mcpRequest = {
  tool: "get_doc_for_file",
  input: {
    file: "src/api/user.ts"  // Path to the file you want to document
  }
};

// Claude would send this JSON to the MCP server via stdin
// The server would parse the file and return structured documentation
// Claude would then use this metadata to understand the file structure

/**
 * Example response from the MCP server for a typical API file:
 * 
 * {
 *   "filePath": "src/api/user.ts",
 *   "functions": [
 *     {
 *       "name": "createUser",
 *       "params": ["req", "res"],
 *       "returnType": "Promise<void>",
 *       "description": "Creates a new user in the database",
 *       "exported": true
 *     },
 *     {
 *       "name": "getUserById",
 *       "params": ["req", "res"],
 *       "returnType": "Promise<void>",
 *       "description": "Retrieves a user by their ID",
 *       "exported": true
 *     }
 *   ],
 *   "interfaces": [
 *     {
 *       "name": "UserRequest",
 *       "description": "Request body for creating a user",
 *       "exported": true,
 *       "properties": [
 *         {
 *           "name": "username",
 *           "type": "string",
 *           "description": "The user's username"
 *         },
 *         {
 *           "name": "email",
 *           "type": "string",
 *           "description": "The user's email address"
 *         }
 *       ],
 *       "methods": []
 *     }
 *   ],
 *   "routes": [
 *     {
 *       "method": "POST",
 *       "path": "/api/users",
 *       "handler": "createUser",
 *       "description": "POST /api/users"
 *     },
 *     {
 *       "method": "GET",
 *       "path": "/api/users/:id",
 *       "handler": "getUserById",
 *       "description": "GET /api/users/:id"
 *     }
 *   ]
 * }
 */
