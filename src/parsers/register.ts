import { parserRegistry } from './index';
import { TypeScriptParser } from './typescript';
import { JavaScriptParser } from './javascript';
import { PythonParser } from './python';

/**
 * Initialize and register all parsers
 */
export function registerParsers(): void {
  // Register TypeScript parser
  parserRegistry.registerParser(new TypeScriptParser());
  
  // Register JavaScript parser
  parserRegistry.registerParser(new JavaScriptParser());
  
  // Register Python parser
  parserRegistry.registerParser(new PythonParser());
}
