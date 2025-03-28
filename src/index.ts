#!/usr/bin/env node
import * as readline from 'readline';
import * as path from 'path';
import { getDocForFile, GetDocForFileInput } from './tools/getDocForFile';

// Define interfaces for MCP protocol
interface MCPRequest {
  tool: string;
  input: Record<string, any>;
}

// Define interfaces for MCP responses
interface ErrorResponse {
  error: string;
  details?: string;
}

type MCPResponse = Record<string, any> | ErrorResponse;

// Create readline interface for stdin/stdout
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Process a single MCP request
async function processMCPRequest(requestJson: string): Promise<void> {
  let request: MCPRequest;
  
  try {
    request = JSON.parse(requestJson);
  } catch (error) {
    const response: ErrorResponse = {
      error: 'Invalid JSON',
      details: (error as Error).message
    };
    console.log(JSON.stringify(response));
    return;
  }

  // Validate the request
  if (!request.tool || typeof request.tool !== 'string') {
    const response: ErrorResponse = {
      error: 'Invalid request',
      details: 'Missing or invalid "tool" field'
    };
    console.log(JSON.stringify(response));
    return;
  }

  if (!request.input || typeof request.input !== 'object') {
    const response: ErrorResponse = {
      error: 'Invalid request',
      details: 'Missing or invalid "input" field'
    };
    console.log(JSON.stringify(response));
    return;
  }

  // Route to the appropriate tool handler
  let response: MCPResponse = {
    error: 'Unknown error',
    details: 'No tool handler was executed properly'
  };

  try {
    switch (request.tool) {
      case 'get_doc_for_file':
        response = await handleGetDocForFile(request.input as GetDocForFileInput);
        break;
      default:
        response = {
          error: 'Unknown tool',
          details: `Tool "${request.tool}" not supported`
        };
    }
  } catch (error) {
    response = {
      error: 'Tool execution failed',
      details: (error as Error).message
    };
  }

  // Send response
  console.log(JSON.stringify(response));
}

// Main processing loop
rl.on('line', (line) => {
  if (line.trim()) {
    processMCPRequest(line);
  }
});

// Handle errors and termination
rl.on('close', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

// If nothing happens for a while, we can exit (optional)
const idleTimeout = 300000; // 5 minutes
const idleTimer = setTimeout(() => {
  process.exit(0);
}, idleTimeout);

// Reset timer on activity
rl.on('line', () => {
  clearTimeout(idleTimer);
});

/**
 * Handles the get_doc_for_file tool request
 * @param input The input with the file path
 * @returns Documentation for the file or an error response
 */
async function handleGetDocForFile(input: GetDocForFileInput): Promise<any> {
  // Simply pass through to the getDocForFile implementation
  return await getDocForFile(input);
}
