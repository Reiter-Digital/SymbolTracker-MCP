import * as fs from 'fs';
import * as path from 'path';
import { symbolRegistry, SymbolType } from '../registry/symbolRegistry';
import { globSync } from 'glob';
import { refreshRegistry } from './refreshRegistry';

/**
 * Input for the find_usages tool
 */
export interface FindUsagesInput {
  symbol: string;          // Symbol name to find usages for
  type?: string;           // Optional symbol type to disambiguate
  file?: string;           // Optional file path to disambiguate (source file)
  includeDefinition?: boolean; // Whether to include the definition in results (default: true)
  maxResults?: number;     // Maximum number of results to return (default: 50)
}

/**
 * Usage location information
 */
interface UsageLocation {
  file: string;            // File where the usage occurs
  line: number;            // Line number in the file
  column: number;          // Column in the line
  snippet: string;         // Code snippet containing the usage
  isDefinition: boolean;   // Whether this is the symbol definition
}

/**
 * Result of find_usages
 */
export interface FindUsagesResult {
  symbol: string;          // The symbol that was searched for
  type: string;            // Symbol type
  usages: UsageLocation[]; // Locations where the symbol is used
  totalFound: number;      // Total number of usages found (may be more than returned)
  limitReached: boolean;   // Whether the result limit was reached
}

/**
 * Find all usages of a symbol across the codebase
 * @param input The find usages query parameters
 * @returns Locations where the symbol is used
 */
export async function findUsages(input: FindUsagesInput): Promise<FindUsagesResult> {
  // Validate input
  if (!input.symbol || typeof input.symbol !== 'string') {
    return {
      symbol: '',
      type: '',
      usages: [],
      totalFound: 0,
      limitReached: false
    };
  }
  
  // Ensure registry is up-to-date
  await refreshRegistry({ fullScan: false });

  // Convert type string to enum if provided
  let symbolType: SymbolType | undefined;
  if (input.type) {
    const typeMap: Record<string, SymbolType> = {
      'function': SymbolType.FUNCTION,
      'class': SymbolType.CLASS,
      'method': SymbolType.METHOD,
      'property': SymbolType.PROPERTY,
      'interface': SymbolType.INTERFACE,
      'type': SymbolType.TYPE,
      'route': SymbolType.ROUTE,
      'variable': SymbolType.VARIABLE
    };
    
    symbolType = typeMap[input.type.toLowerCase()];
  }

  // Find the symbol definition first
  const searchResult = symbolRegistry.search({
    query: input.symbol,
    type: symbolType,
    file: input.file,
    exactMatch: true,
    includePrivate: true,
    limit: 1
  });

  // Check if the symbol was found
  if (searchResult.results.length === 0) {
    return {
      symbol: input.symbol,
      type: input.type || 'unknown',
      usages: [],
      totalFound: 0,
      limitReached: false
    };
  }

  // Get the symbol information
  const symbolInfo = searchResult.results[0];
  const symbolName = symbolInfo.symbol;
  const symbolFile = symbolInfo.file;
  
  // Initialize results array
  const usages: UsageLocation[] = [];
  
  // Include the definition if requested
  if (input.includeDefinition !== false && fs.existsSync(symbolFile)) {
    try {
      const fileContent = fs.readFileSync(symbolFile, 'utf8');
      const lines = fileContent.split('\n');
      
      // Simple heuristic to find the definition line
      let definitionLine = 0;
      let definitionColumn = 0;
      
      // For methods/properties, look for "name: " or "name(" patterns
      // For classes/interfaces/functions, look for "name {" or "name(" patterns
      const patterns = [
        new RegExp(`\\b${escapeRegExp(symbolName)}\\s*\\(`),        // Function/method call
        new RegExp(`\\b${escapeRegExp(symbolName)}\\s*\\{`),        // Class/interface definition
        new RegExp(`\\b${escapeRegExp(symbolName)}\\s*:`),          // Property definition
        new RegExp(`\\bfunction\\s+${escapeRegExp(symbolName)}\\b`) // Function declaration
      ];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of patterns) {
          const match = pattern.exec(line);
          if (match) {
            definitionLine = i;
            definitionColumn = match.index;
            
            // Get a snippet around the definition (3 lines)
            const startLine = Math.max(0, definitionLine - 1);
            const endLine = Math.min(lines.length - 1, definitionLine + 1);
            const snippet = lines.slice(startLine, endLine + 1).join('\\n');
            
            usages.push({
              file: symbolFile,
              line: definitionLine + 1, // 1-based line numbers
              column: definitionColumn + 1, // 1-based column numbers
              snippet,
              isDefinition: true
            });
            
            // We found a match, no need to check other patterns
            break;
          }
        }
        
        // If we found the definition, no need to check other lines
        if (definitionLine > 0) {
          break;
        }
      }
    } catch (error) {
      console.error(`Error reading file ${symbolFile}:`, error);
    }
  }
  
  // Find all potential files to search
  // This could be optimized to only search in relevant files
  const filePatterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  const cwd = process.cwd();
  const allFiles: string[] = [];
  
  // Gather all files matching patterns
  for (const pattern of filePatterns) {
    const files = globSync(pattern, { cwd, absolute: true });
    allFiles.push(...files);
  }
  
  // Search for usages in all files
  const maxResults = input.maxResults || 50;
  let totalFound = usages.length; // Start with definition if included
  let limitReached = false;
  
  for (const file of allFiles) {
    // Skip the definition file if we already processed it
    if (file === symbolFile && input.includeDefinition !== false) {
      continue;
    }
    
    try {
      if (fs.existsSync(file)) {
        const fileContent = fs.readFileSync(file, 'utf8');
        const lines = fileContent.split('\n');
        
        // Use a regex to find the symbol
        // This is a simple implementation and might have false positives
        // A more robust implementation would use an AST parser
        const pattern = new RegExp(`\\b${escapeRegExp(symbolName)}\\b`, 'g');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match;
          
          // Find all matches in the line
          while ((match = pattern.exec(line)) !== null) {
            totalFound++;
            
            // Check if we've reached the limit
            if (usages.length >= maxResults) {
              limitReached = true;
              break;
            }
            
            // Get a snippet around the usage (3 lines)
            const startLine = Math.max(0, i - 1);
            const endLine = Math.min(lines.length - 1, i + 1);
            const snippet = lines.slice(startLine, endLine + 1).join('\\n');
            
            usages.push({
              file,
              line: i + 1, // 1-based line numbers
              column: match.index + 1, // 1-based column numbers
              snippet,
              isDefinition: false
            });
          }
          
          if (limitReached) {
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
    
    if (limitReached) {
      break;
    }
  }
  
  return {
    symbol: symbolName,
    type: symbolInfo.type,
    usages,
    totalFound,
    limitReached
  };
}

/**
 * Escape special characters in a string for use in a regular expression
 * @param string String to escape
 * @returns Escaped string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
