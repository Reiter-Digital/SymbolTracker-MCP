import * as path from 'path';
import { TypeScriptParser } from './typescript';
import { JavaScriptParser } from './javascript';

export interface FileParser {
  parseFile(filePath: string): Promise<any>;
  supportsFile(filePath: string): boolean;
}

export function getParserForFile(filePath: string): FileParser | null {
  const ext = path.extname(filePath).toLowerCase();
  
  // TypeScript/TSX parser
  if (['.ts', '.tsx'].includes(ext)) {
    return new TypeScriptParser();
  }
  
  // JavaScript/JSX parser
  if (['.js', '.jsx'].includes(ext)) {
    return new JavaScriptParser();
  }
  
  // Add support for Python, Dart/Flutter, etc. in future implementations
  
  return null;
}
