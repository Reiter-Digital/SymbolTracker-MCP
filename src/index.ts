#!/usr/bin/env node
import * as readline from 'readline';
import * as path from 'path';
import { getDocForFile, GetDocForFileInput } from './tools/getDocForFile';
import { searchProjectSymbols, SearchProjectSymbolsInput } from './tools/searchProjectSymbols';
import { autocompleteSymbol, AutocompleteSymbolInput } from './tools/autocompleteSymbol';
import { getDocForSymbol, GetDocForSymbolInput } from './tools/getDocForSymbol';
import { findUsages, FindUsagesInput } from './tools/findUsages';
import { refreshRegistry, RefreshRegistryInput } from './tools/refreshRegistry';

// Define interfaces for MCP protocol
interface MCPRequest {
  tool: string;
  input: Record<string, any>;
}

// Supported MCP tool names
type MCPToolName = 'get_doc_for_file' | 'search_project_symbols' | 'autocomplete_symbol' | 'get_doc_for_symbol' | 'find_usages' | 'refresh_registry';

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
      case 'search_project_symbols':
        response = await handleSearchProjectSymbols(request.input as SearchProjectSymbolsInput);
        break;
      case 'autocomplete_symbol':
        response = await handleAutocompleteSymbol(request.input as AutocompleteSymbolInput);
        break;
      case 'get_doc_for_symbol':
        response = await handleGetDocForSymbol(request.input as GetDocForSymbolInput);
        break;
      case 'find_usages':
        response = await handleFindUsages(request.input as FindUsagesInput);
        break;
      case 'refresh_registry':
        response = await handleRefreshRegistry(request.input as RefreshRegistryInput);
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
  // Pass through to the getDocForFile implementation
  return await getDocForFile(input);
}

/**
 * Handles the search_project_symbols tool request
 * @param input The search query input
 * @returns Symbol search results
 */
async function handleSearchProjectSymbols(input: SearchProjectSymbolsInput): Promise<any> {
  // Pass through to the searchProjectSymbols implementation
  return await searchProjectSymbols(input);
}

/**
 * Handles the autocomplete_symbol tool request
 * @param input The autocomplete query input
 * @returns Symbol autocompletion results
 */
async function handleAutocompleteSymbol(input: AutocompleteSymbolInput): Promise<any> {
  // Pass through to the autocompleteSymbol implementation
  return await autocompleteSymbol(input);
}

/**
 * Handles the get_doc_for_symbol tool request
 * @param input The symbol query input
 * @returns Symbol documentation results
 */
async function handleGetDocForSymbol(input: GetDocForSymbolInput): Promise<any> {
  // Pass through to the getDocForSymbol implementation
  return await getDocForSymbol(input);
}

/**
 * Handles the find_usages tool request
 * @param input The find usages query input
 * @returns Symbol usage locations
 */
async function handleFindUsages(input: FindUsagesInput): Promise<any> {
  // Pass through to the findUsages implementation
  return await findUsages(input);
}

/**
 * Handles the refresh_registry tool request
 * @param input The refresh registry input
 * @returns Registry refresh results
 */
async function handleRefreshRegistry(input: RefreshRegistryInput): Promise<any> {
  // Pass through to the refreshRegistry implementation
  return await refreshRegistry(input);
}
