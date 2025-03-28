import { symbolRegistry, SymbolType, SymbolSearchResult } from '../registry/symbolRegistry';

/**
 * Input interface for the search_project_symbols tool
 */
export interface SearchProjectSymbolsInput {
  query: string;          // Search term
  type?: string;          // Optional filter by symbol type
  file?: string;          // Optional filter by file path
  exactMatch?: boolean;   // Whether to require exact match
  includePrivate?: boolean; // Whether to include private symbols
  limit?: number;         // Maximum number of results
}

/**
 * Searches for symbols across the project
 * @param input The search query input
 * @returns Search results
 */
export async function searchProjectSymbols(input: SearchProjectSymbolsInput): Promise<SymbolSearchResult> {
  // Validate input
  if (!input.query || typeof input.query !== 'string') {
    return {
      results: []
    };
  }

  // Convert type string to enum if provided
  let symbolType: SymbolType | undefined;
  if (input.type) {
    switch (input.type.toLowerCase()) {
      case 'function':
        symbolType = SymbolType.FUNCTION;
        break;
      case 'class':
        symbolType = SymbolType.CLASS;
        break;
      case 'method':
        symbolType = SymbolType.METHOD;
        break;
      case 'property':
        symbolType = SymbolType.PROPERTY;
        break;
      case 'interface':
        symbolType = SymbolType.INTERFACE;
        break;
      case 'type':
        symbolType = SymbolType.TYPE;
        break;
      case 'route':
        symbolType = SymbolType.ROUTE;
        break;
      case 'variable':
        symbolType = SymbolType.VARIABLE;
        break;
      default:
        symbolType = undefined;
    }
  }

  // Perform the search
  return symbolRegistry.search({
    query: input.query,
    type: symbolType,
    file: input.file,
    exactMatch: input.exactMatch,
    includePrivate: input.includePrivate,
    limit: input.limit
  });
}
