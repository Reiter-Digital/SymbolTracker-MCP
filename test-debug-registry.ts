import { symbolRegistry } from './src/registry/symbolRegistry';
import { FileDocResponse } from './src/types';

// Manual test data based on our JS sample file
const testFileDoc: FileDocResponse = {
  filePath: "/Users/markus/dev/DocumentationMCP/src/test-js-sample.js",
  functions: [{
    name: "add",
    params: ["a", "b"],
    returnType: "number",
    description: "A sample JavaScript function",
    exported: true
  }],
  classes: [{
    name: "AuthManager",
    description: "A class that manages user authentication",
    exported: true,
    methods: [{
      name: "login",
      params: ["user"],
      returnType: "boolean",
      description: "Logs in a user",
      visibility: "public"
    }],
    properties: []
  }],
  routes: [{
    method: "GET",
    path: "/api/users",
    handler: "<inline function>",
    description: "GET /api/users"
  }]
};

// Register the symbols
symbolRegistry.registerFileSymbols(testFileDoc);

// Search for a function
const searchResult = symbolRegistry.search({
  query: "add",
  type: undefined,
  exactMatch: false
});

// Log results
console.log("Search results:", JSON.stringify(searchResult, null, 2));
console.log("All symbols:", JSON.stringify(symbolRegistry.getAllSymbols(), null, 2));
