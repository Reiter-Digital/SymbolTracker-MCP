import { symbolRegistry, SymbolType, SymbolInfo } from '../registry/symbolRegistry';

/**
 * Input for the get_doc_for_symbol tool
 */
export interface GetDocForSymbolInput {
  symbol: string;          // Symbol name to get documentation for
  type?: string;           // Optional symbol type to disambiguate
  file?: string;           // Optional file path to disambiguate
  includeRelated?: boolean; // Whether to include related symbols (default: true)
}

/**
 * Related symbol information
 */
interface RelatedSymbolInfo {
  symbol: string;
  type: string;
  relationship: 'parent' | 'child' | 'sibling' | 'implementation';
  description?: string;
}

/**
 * Result of get_doc_for_symbol
 */
export interface GetDocForSymbolResult {
  found: boolean;         // Whether the symbol was found
  symbol?: {
    name: string;          // Symbol name
    type: string;          // Symbol type
    file: string;          // File where the symbol is defined
    description?: string;  // Description from JSDoc
    signature?: string;    // Signature for functions/methods
    exported?: boolean;    // Whether the symbol is exported
    visibility?: string;   // Symbol visibility (public, private, protected)
    metadata?: Record<string, any>; // Additional metadata
    relatedSymbols?: RelatedSymbolInfo[]; // Related symbols
  };
  error?: string;         // Error message if symbol not found
}

/**
 * Get detailed documentation for a specific symbol
 * @param input The symbol query parameters
 * @returns Detailed documentation for the symbol
 */
export async function getDocForSymbol(input: GetDocForSymbolInput): Promise<GetDocForSymbolResult> {
  // Validate input
  if (!input.symbol || typeof input.symbol !== 'string') {
    return {
      found: false,
      error: 'Missing or invalid symbol name'
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

  // Search for the symbol
  const searchResult = symbolRegistry.search({
    query: input.symbol,
    type: symbolType,
    file: input.file,
    exactMatch: true,
    includePrivate: true, // Include private symbols when getting specific documentation
    limit: 1
  });

  // Check if any results were found
  if (searchResult.results.length === 0) {
    return {
      found: false,
      error: `Symbol '${input.symbol}' not found`
    };
  }

  // Get the first result
  const symbolInfo = searchResult.results[0];
  
  // Determine related symbols
  const relatedSymbols: RelatedSymbolInfo[] = [];
  
  if (input.includeRelated !== false) {
    // Find related symbols based on relationship types
    
    // For methods or properties, find their parent class/interface
    if (symbolInfo.parentSymbol) {
      const parentSearch = symbolRegistry.search({
        query: symbolInfo.parentSymbol,
        exactMatch: true,
        limit: 1
      });
      
      if (parentSearch.results.length > 0) {
        const parent = parentSearch.results[0];
        relatedSymbols.push({
          symbol: parent.symbol,
          type: parent.type,
          relationship: 'parent',
          description: parent.description
        });
      }
    }
    
    // For classes/interfaces, find their methods and properties
    if (symbolInfo.type === SymbolType.CLASS || symbolInfo.type === SymbolType.INTERFACE) {
      const childrenSearch = symbolRegistry.search({
        query: '',
        exactMatch: false,
        limit: 50,
        includePrivate: true
      });
      
      // Filter for children of this symbol
      const children = childrenSearch.results.filter(s => s.parentSymbol === symbolInfo.symbol);
      
      // Add children to related symbols
      children.forEach(child => {
        relatedSymbols.push({
          symbol: child.symbol,
          type: child.type,
          relationship: 'child',
          description: child.description
        });
      });
    }
  }

  // Format the result
  return {
    found: true,
    symbol: {
      name: symbolInfo.symbol,
      type: symbolInfo.type,
      file: symbolInfo.file,
      description: symbolInfo.description,
      signature: symbolInfo.signature,
      exported: symbolInfo.exported,
      visibility: symbolInfo.metadata?.visibility,
      metadata: symbolInfo.metadata,
      relatedSymbols: relatedSymbols.length > 0 ? relatedSymbols : undefined
    }
  };
}
