import * as fs from 'fs';
import * as path from 'path';
import { parserRegistry } from '../parsers';
import { registerParsers } from '../parsers/register';
import { FileDocResponse, ErrorResponse } from '../types';

// Interface for the input
export interface GetDocForFileInput {
  file: string;
}

// Initialize the parser registry
registerParsers();

/**
 * Extracts documentation from a file using the appropriate parser
 * @param input The input object containing the file path
 * @returns Structured documentation or error response
 */
export async function getDocForFile(input: GetDocForFileInput): Promise<FileDocResponse | ErrorResponse> {
  // Validate input
  if (!input.file || typeof input.file !== 'string') {
    return {
      error: 'Invalid input',
      details: 'Missing or invalid "file" field'
    };
  }

  const filePath = path.resolve(input.file);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {
      error: 'File not found',
      details: `File not found at path: ${filePath}`
    };
  }

  // Get a parser for this file
  const parser = parserRegistry.getParserForFile(filePath);
  
  if (!parser) {
    const ext = path.extname(filePath).toLowerCase();
    return {
      error: 'Unsupported file type',
      details: `No parser available for file type: ${ext}`
    };
  }
  
  try {
    // Use the parser to parse the file
    return await parser.parseFile(filePath);
  } catch (error) {
    return {
      error: 'Parsing error',
      details: (error as Error).message
    };
  }
}
