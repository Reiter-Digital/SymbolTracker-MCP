import * as path from 'path';
import { FileDocResponse, ErrorResponse } from '../types';

/**
 * Interface for language parsers
 */
export interface FileParser {
  /**
   * Check if this parser supports the given file
   * @param filePath Path to the file
   * @returns Whether this parser can handle the file
   */
  supportsFile(filePath: string): boolean;
  
  /**
   * Parse a file and extract documentation
   * @param filePath Path to the file to parse
   * @returns Structured documentation about the file
   */
  parseFile(filePath: string): Promise<FileDocResponse | ErrorResponse>;
}

/**
 * Registry of file parsers
 */
export class ParserRegistry {
  private parsers: FileParser[] = [];
  
  /**
   * Register a new parser
   * @param parser Parser instance to register
   */
  registerParser(parser: FileParser): void {
    this.parsers.push(parser);
  }
  
  /**
   * Get an appropriate parser for a file
   * @param filePath Path to the file
   * @returns A parser that can handle the file, or undefined if none found
   */
  getParserForFile(filePath: string): FileParser | undefined {
    return this.parsers.find(parser => parser.supportsFile(filePath));
  }
}

// Create a singleton registry instance
export const parserRegistry = new ParserRegistry();
