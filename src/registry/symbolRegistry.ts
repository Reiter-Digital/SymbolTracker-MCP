import * as path from 'path';
import { FileDocResponse } from '../types';

/**
 * Symbol type enum
 */
export enum SymbolType {
  FUNCTION = 'function',
  CLASS = 'class',
  METHOD = 'method',
  PROPERTY = 'property',
  INTERFACE = 'interface',
  TYPE = 'type',
  ROUTE = 'route',
  VARIABLE = 'variable'
}

/**
 * Symbol information interface
 */
export interface SymbolInfo {
  symbol: string;         // Symbol name (e.g., "createUser")
  type: SymbolType;       // Type of symbol
  file: string;           // Source file path
  description?: string;   // Description or JSDoc
  signature?: string;     // Function signature
  exported?: boolean;     // Whether the symbol is exported
  parentSymbol?: string;  // Parent symbol (e.g., class name for methods)
  location?: {            // Optional location information
    line: number;
    column: number;
  };
  metadata?: Record<string, any>;  // Additional metadata specific to symbol type
}

/**
 * Symbol search query interface
 */
export interface SymbolSearchQuery {
  query: string;          // Search term
  type?: SymbolType;      // Optional filter by symbol type
  file?: string;          // Optional filter by file path
  exactMatch?: boolean;   // Whether to require exact match (default: false)
  includePrivate?: boolean; // Whether to include private symbols (default: false)
  limit?: number;         // Maximum number of results (default: 20)
}

/**
 * Symbol search result interface
 */
export interface SymbolSearchResult {
  results: SymbolInfo[];
}

/**
 * Registry for code symbols found across the project
 */
export class SymbolRegistry {
  private symbols: SymbolInfo[] = [];
  
  /**
   * Register a new symbol
   * @param symbol Symbol information
   */
  registerSymbol(symbol: SymbolInfo): void {
    // Check if symbol already exists to avoid duplicates
    const existingIndex = this.symbols.findIndex(s => 
      s.symbol === symbol.symbol && 
      s.type === symbol.type && 
      s.file === symbol.file &&
      s.parentSymbol === symbol.parentSymbol
    );
    
    if (existingIndex >= 0) {
      // Update existing symbol
      this.symbols[existingIndex] = {
        ...this.symbols[existingIndex],
        ...symbol
      };
    } else {
      // Add new symbol
      this.symbols.push(symbol);
    }
  }
  
  /**
   * Register symbols from a parsed file document
   * @param fileDoc Parsed file documentation
   */
  registerFileSymbols(fileDoc: FileDocResponse): void {
    const filePath = fileDoc.filePath;
    
    // Register functions
    if (fileDoc.functions) {
      for (const func of fileDoc.functions) {
        this.registerSymbol({
          symbol: func.name,
          type: SymbolType.FUNCTION,
          file: filePath,
          description: func.description,
          signature: `(${func.params.join(', ')})${func.returnType ? `: ${func.returnType}` : ''}`,
          exported: func.exported
        });
      }
    }
    
    // Register classes
    if (fileDoc.classes) {
      for (const cls of fileDoc.classes) {
        // Register the class itself
        this.registerSymbol({
          symbol: cls.name,
          type: SymbolType.CLASS,
          file: filePath,
          description: cls.description,
          exported: cls.exported,
          metadata: {
            isComponent: cls.isComponent
          }
        });
        
        // Register methods
        for (const method of cls.methods) {
          this.registerSymbol({
            symbol: method.name,
            type: SymbolType.METHOD,
            file: filePath,
            description: method.description,
            signature: `(${method.params.join(', ')})${method.returnType ? `: ${method.returnType}` : ''}`,
            parentSymbol: cls.name,
            exported: cls.exported,
            metadata: {
              visibility: method.visibility || 'public'
            }
          });
        }
        
        // Register properties
        for (const prop of cls.properties) {
          this.registerSymbol({
            symbol: prop.name,
            type: SymbolType.PROPERTY,
            file: filePath,
            description: prop.description,
            signature: prop.type ? `: ${prop.type}` : '',
            parentSymbol: cls.name,
            exported: cls.exported,
            metadata: {
              visibility: prop.visibility || 'public'
            }
          });
        }
      }
    }
    
    // Register interfaces
    if (fileDoc.interfaces) {
      for (const iface of fileDoc.interfaces) {
        // Register the interface itself
        this.registerSymbol({
          symbol: iface.name,
          type: SymbolType.INTERFACE,
          file: filePath,
          description: iface.description,
          exported: iface.exported
        });
        
        // Register properties
        for (const prop of iface.properties) {
          this.registerSymbol({
            symbol: prop.name,
            type: SymbolType.PROPERTY,
            file: filePath,
            description: prop.description,
            signature: prop.type ? `: ${prop.type}` : '',
            parentSymbol: iface.name,
            exported: iface.exported
          });
        }
        
        // Register methods
        for (const method of iface.methods) {
          this.registerSymbol({
            symbol: method.name,
            type: SymbolType.METHOD,
            file: filePath,
            description: method.description,
            signature: `(${method.params.join(', ')})${method.returnType ? `: ${method.returnType}` : ''}`,
            parentSymbol: iface.name,
            exported: iface.exported
          });
        }
      }
    }
    
    // Register type aliases
    if (fileDoc.typeAliases) {
      for (const typeAlias of fileDoc.typeAliases) {
        this.registerSymbol({
          symbol: typeAlias.name,
          type: SymbolType.TYPE,
          file: filePath,
          description: typeAlias.description,
          signature: `: ${typeAlias.type}`,
          exported: typeAlias.exported
        });
      }
    }
    
    // Register routes
    if (fileDoc.routes) {
      for (const route of fileDoc.routes) {
        const routeSymbol = `${route.method} ${route.path}`;
        this.registerSymbol({
          symbol: routeSymbol,
          type: SymbolType.ROUTE,
          file: filePath,
          description: route.description,
          metadata: {
            method: route.method,
            path: route.path,
            handler: route.handler
          }
        });
      }
    }
  }
  
  /**
   * Search for symbols
   * @param query Search query
   * @returns Search results
   */
  search(query: SymbolSearchQuery): SymbolSearchResult {
    const {
      query: searchTerm,
      type,
      file,
      exactMatch = false,
      includePrivate = false,
      limit = 20
    } = query;
    
    let results = this.symbols.filter(symbol => {
      // Filter by type if specified
      if (type && symbol.type !== type) {
        return false;
      }
      
      // Filter by file if specified
      if (file && !symbol.file.includes(file)) {
        return false;
      }
      
      // Filter private symbols if not included
      if (!includePrivate && 
          (symbol.metadata?.visibility === 'private' || 
           symbol.symbol.startsWith('_') || 
           symbol.symbol.startsWith('#'))) {
        return false;
      }
      
      // Match by symbol name
      if (exactMatch) {
        return symbol.symbol === searchTerm;
      } else {
        return symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      }
    });
    
    // Sort results by relevance (exact matches first, then by symbol type priority)
    results.sort((a, b) => {
      // Exact matches come first
      const aExactMatch = a.symbol === searchTerm;
      const bExactMatch = b.symbol === searchTerm;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Exported symbols come before non-exported
      if (a.exported && !b.exported) return -1;
      if (!a.exported && b.exported) return 1;
      
      // Sort by symbol type priority (functions, classes, routes take precedence)
      const typePriority = {
        [SymbolType.FUNCTION]: 1,
        [SymbolType.CLASS]: 2,
        [SymbolType.ROUTE]: 3,
        [SymbolType.METHOD]: 4,
        [SymbolType.INTERFACE]: 5,
        [SymbolType.TYPE]: 6,
        [SymbolType.PROPERTY]: 7,
        [SymbolType.VARIABLE]: 8
      };
      
      const aPriority = typePriority[a.type] || 999;
      const bPriority = typePriority[b.type] || 999;
      
      return aPriority - bPriority;
    });
    
    // Limit the number of results
    if (limit > 0 && results.length > limit) {
      results = results.slice(0, limit);
    }
    
    return { results };
  }
  
  /**
   * Get all registered symbols
   * @returns Array of symbol information
   */
  getAllSymbols(): SymbolInfo[] {
    return [...this.symbols];
  }
  
  /**
   * Clear all registered symbols
   */
  clear(): void {
    this.symbols = [];
  }
}

// Create a singleton instance of the registry
export const symbolRegistry = new SymbolRegistry();
