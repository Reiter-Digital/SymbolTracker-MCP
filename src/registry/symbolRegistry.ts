import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
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
 * File tracking information
 */
export interface FileTrackingInfo {
  path: string;           // Absolute file path
  lastParsed: number;     // Timestamp when the file was last parsed
  lastModified: number;   // Last modified timestamp of the file
  exists: boolean;        // Whether the file still exists
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
 * Registry state interface
 */
export interface RegistryState {
  symbols: SymbolInfo[];
  files: FileTrackingInfo[];
  lastFullRefresh: number;
}

/**
 * Registry for code symbols found across the project
 */
export class SymbolRegistry {
  // Private state
  private symbols: SymbolInfo[] = [];
  private files: FileTrackingInfo[] = [];
  private lastFullRefresh: number = 0;
  
  /**
   * Initialize the registry from a persisted state
   * @param state The persisted registry state
   */
  initializeFromState(state: RegistryState): void {
    if (state.symbols && state.symbols.length > 0) {
      this.symbols = state.symbols;
    }
    
    if (state.files && state.files.length > 0) {
      this.files = state.files;
    }
    
    if (state.lastFullRefresh && state.lastFullRefresh > 0) {
      this.lastFullRefresh = state.lastFullRefresh;
    }
  }
  
  /**
   * Track a file in the registry
   * @param filePath Path to the file
   * @param exists Whether the file exists
   */
  trackFile(filePath: string, exists: boolean = true): void {
    const absolutePath = path.resolve(filePath);
    
    // Check if file already exists in tracking
    const existingIndex = this.files.findIndex(f => f.path === absolutePath);
    
    const now = Date.now();
    let lastModified = now;
    
    // Get file's last modified time if it exists
    if (exists && fs.existsSync(absolutePath)) {
      const stats = fs.statSync(absolutePath);
      lastModified = stats.mtimeMs;
    }
    
    if (existingIndex >= 0) {
      // Update existing file tracking
      this.files[existingIndex] = {
        ...this.files[existingIndex],
        lastParsed: now,
        lastModified,
        exists
      };
    } else {
      // Add new file tracking
      this.files.push({
        path: absolutePath,
        lastParsed: now,
        lastModified,
        exists
      });
    }
  }
  
  /**
   * Check if a file needs to be re-parsed
   * @param filePath Path to the file
   * @returns Whether the file needs to be re-parsed
   */
  fileNeedsRefresh(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return false; // File doesn't exist, can't refresh
    }
    
    // Get file stats
    const stats = fs.statSync(absolutePath);
    const fileModified = stats.mtimeMs;
    
    // Find file in tracking
    const fileInfo = this.files.find(f => f.path === absolutePath);
    
    if (!fileInfo) {
      return true; // File not tracked yet, needs parsing
    }
    
    // Check if file has been modified since last parse
    return fileModified > fileInfo.lastParsed;
  }
  
  /**
   * Clean up symbols for deleted files
   */
  cleanupDeletedFiles(): void {
    // Find files that no longer exist
    const deletedFiles = this.files.filter(f => !fs.existsSync(f.path));
    
    // Remove symbols for deleted files
    for (const file of deletedFiles) {
      this.symbols = this.symbols.filter(s => s.file !== file.path);
      
      // Mark file as not existing
      const fileIndex = this.files.findIndex(f => f.path === file.path);
      if (fileIndex >= 0) {
        this.files[fileIndex].exists = false;
      }
    }
    
    // Persist changes
    this.persistToDisk();
  }
  
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
    
    // Persist the updated registry to disk
    this.persistToDisk();
  }
  
  /**
   * Persist the symbol registry to disk
   */
  private persistToDisk(): void {
    try {
      const state: RegistryState = {
        symbols: this.symbols,
        files: this.files,
        lastFullRefresh: this.lastFullRefresh
      };
      
      fs.writeFileSync(REGISTRY_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('Error persisting symbol registry:', error);
    }
  }
  
  /**
   * Register symbols from a parsed file document
   * @param fileDoc Parsed file documentation
   */
  registerFileSymbols(fileDoc: FileDocResponse): void {
    const filePath = fileDoc.filePath;
    
    // Track this file
    this.trackFile(filePath);
    
    // Remove any existing symbols for this file before adding new ones
    this.symbols = this.symbols.filter(s => s.file !== filePath);
    
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
   * Get list of files that need to be refreshed
   * @returns Array of file paths that need refreshing
   */
  async getFilesNeedingRefresh(): Promise<string[]> {
    return this.files
      .filter(f => f.exists && this.fileNeedsRefresh(f.path))
      .map(f => f.path);
  }
  
  /**
   * Remove all symbols for a specific file
   * @param filePath Path to the file
   */
  removeFileSymbols(filePath: string): void {
    const absolutePath = path.resolve(filePath);
    this.symbols = this.symbols.filter(s => s.file !== absolutePath);
    
    // Mark file as no longer existing if it doesn't exist
    if (!fs.existsSync(absolutePath)) {
      const fileIndex = this.files.findIndex(f => f.path === absolutePath);
      if (fileIndex >= 0) {
        this.files[fileIndex].exists = false;
      }
    }
    
    // Persist changes
    this.persistToDisk();
  }
  
  /**
   * Refresh the registry to handle file changes
   * For backward compatibility - now just identifies files needing refresh
   * @returns Array of file paths that need refreshing
   */
  async refresh(): Promise<string[]> {
    // Clean up symbols for deleted files
    this.cleanupDeletedFiles();
    
    // Find all tracked files that need refresh
    return this.getFilesNeedingRefresh();
  }
  
  /**
   * Perform a full scan of the codebase to discover all files
   * @param baseDir Base directory to scan
   * @param patterns File patterns to include (default: all TypeScript and JavaScript files)
   */
  async fullScan(baseDir: string = process.cwd(), patterns: string[] = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']): Promise<string[]> {
    const foundFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob.glob(pattern, { cwd: baseDir, absolute: true });
      foundFiles.push(...files);
    }
    
    // Mark these files as needing parsing
    for (const file of foundFiles) {
      // Only track if we haven't seen this file before
      if (!this.files.some(f => f.path === file)) {
        this.trackFile(file, true);
      }
    }
    
    return foundFiles;
  }
  
  /**
   * Clear all registered symbols
   */
  clear(): void {
    this.symbols = [];
    this.files = [];
    this.lastFullRefresh = 0;
    this.persistToDisk();
  }
}

// File path for persistence
const REGISTRY_FILE_PATH = path.join(process.cwd(), '.symbol-registry.json');

/**
 * Load registry state from disk if available
 */
function loadRegistryFromDisk(): RegistryState {
  try {
    if (fs.existsSync(REGISTRY_FILE_PATH)) {
      const data = fs.readFileSync(REGISTRY_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading symbol registry:', error);
  }
  return { symbols: [], files: [], lastFullRefresh: 0 };
}

/**
 * Create and initialize the registry from persisted state
 */
function createAndInitializeRegistry(): SymbolRegistry {
  const registry = new SymbolRegistry();
  const persistedState = loadRegistryFromDisk();
  
  registry.initializeFromState(persistedState);
  registry.cleanupDeletedFiles();
  
  return registry;
}

// Create a singleton instance of the registry and load persisted state
export const symbolRegistry = createAndInitializeRegistry();
