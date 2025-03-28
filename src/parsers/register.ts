import { parserRegistry } from './index';
import { TypeScriptParser } from './typescript';
import { JavaScriptParser } from './javascript';

/**
 * Initialize and register all parsers
 */
export function registerParsers(): void {
  // Register TypeScript parser
  parserRegistry.registerParser(new TypeScriptParser());
  
  // Register JavaScript parser
  parserRegistry.registerParser(new JavaScriptParser());
  
  // Add more parsers here as they are implemented
  // Example:
  // parserRegistry.registerParser(new PythonParser());
}
