import { symbolRegistry, SymbolType } from '../registry/symbolRegistry';

/**
 * Input for the autocomplete_symbol tool
 */
export interface AutocompleteSymbolInput {
  prefix: string;           // Prefix to autocomplete
  type?: string;            // Optional filter by symbol type
  limit?: number;           // Maximum number of results (default: 10)
  includePrivate?: boolean; // Whether to include private symbols (default: false)
}

/**
 * Result of symbol autocompletion
 */
export interface AutocompleteSymbolResult {
  completions: Array<{
    symbol: string;         // The completed symbol name
    type: string;           // Symbol type
    signature?: string;     // Optional signature for functions/methods
    description?: string;   // Optional description from JSDoc
    filePath?: string;      // Optional file path where the symbol is defined
  }>;
}

/**
 * Autocomplete a partial symbol name
 * @param input The autocomplete query parameters
 * @returns Autocompletion results
 */
export async function autocompleteSymbol(input: AutocompleteSymbolInput): Promise<AutocompleteSymbolResult> {
  // Validate input
  if (!input.prefix || typeof input.prefix !== 'string') {
    return { completions: [] };
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

  // Set default limit if not specified
  const limit = input.limit || 10;

  // Perform the search to get possible completions
  const searchResult = symbolRegistry.search({
    query: input.prefix,
    type: symbolType,
    exactMatch: false,
    includePrivate: input.includePrivate || false,
    limit: limit
  });

  // Map search results to completions
  const completions = searchResult.results.map(result => ({
    symbol: result.symbol,
    type: result.type,
    signature: result.signature,
    description: result.description,
    filePath: result.file
  }));

  return { completions };
}
