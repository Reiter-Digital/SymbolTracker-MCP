import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { Project, Node, SyntaxKind } from 'ts-morph';
import { getParserForFile } from '../languages';

// Interface for the input
export interface SearchForSymbolInput {
  symbol: string;
  directory?: string;
  filePatterns?: string[];
  includeReferences?: boolean;
}

// Interface for the search result
interface SearchResult {
  symbol: string;
  definitions: SymbolLocation[];
  references?: SymbolLocation[];
}

// Interface for symbol location
interface SymbolLocation {
  filePath: string;
  line: number;
  column: number;
  kind: string; // 'function', 'class', 'interface', etc.
  snippet: string;
}

// Error response interface
interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Searches for symbols (functions, classes, etc.) across the codebase
 * @param input The input object containing the search parameters
 * @returns Search results or error response
 */
export async function searchForSymbol(input: SearchForSymbolInput): Promise<SearchResult | ErrorResponse> {
  // Validate input
  if (!input.symbol || typeof input.symbol !== 'string') {
    return {
      error: 'Invalid input',
      details: 'Missing or invalid "symbol" field'
    };
  }

  // Set defaults
  const directory = input.directory || process.cwd();
  const filePatterns = input.filePatterns || ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  const includeReferences = input.includeReferences !== false;

  try {
    // Find all files that match the patterns
    const files: string[] = [];
    for (const pattern of filePatterns) {
      const matches = glob.sync(pattern, { cwd: directory, absolute: true });
      files.push(...matches);
    }

    if (files.length === 0) {
      return {
        error: 'No files found',
        details: `No files matching patterns ${filePatterns.join(', ')} in ${directory}`
      };
    }

    // Create a Project to hold all the files
    const project = new Project({
      compilerOptions: {
        allowJs: true,
        jsx: 3, // 3 is equivalent to 'react'
      }
    });

    // Add files to the project - only add files that have parsers
    const filesToAnalyze: string[] = [];
    for (const file of files) {
      const parser = getParserForFile(file);
      if (parser && parser.supportsFile(file)) {
        filesToAnalyze.push(file);
      }
    }

    // Add files to project
    project.addSourceFilesAtPaths(filesToAnalyze);

    // Search for definitions
    const definitions: SymbolLocation[] = [];
    
    // Process each source file
    for (const sourceFile of project.getSourceFiles()) {
      const filePath = sourceFile.getFilePath();
      
      // First pass: look for exact name matches
      sourceFile.forEachDescendant((node) => {
        let name = '';
        let kind = '';
        let valid = false;

        // Check different node types
        if (Node.isFunctionDeclaration(node) && node.getName() === input.symbol) {
          name = node.getName() || '';
          kind = 'function';
          valid = true;
        } else if (Node.isClassDeclaration(node) && node.getName() === input.symbol) {
          name = node.getName() || '';
          kind = 'class';
          valid = true;
        } else if (Node.isInterfaceDeclaration(node) && node.getName() === input.symbol) {
          name = node.getName() || '';
          kind = 'interface';
          valid = true;
        } else if (Node.isTypeAliasDeclaration(node) && node.getName() === input.symbol) {
          name = node.getName() || '';
          kind = 'type';
          valid = true;
        } else if (Node.isVariableDeclaration(node) && node.getName() === input.symbol) {
          name = node.getName() || '';
          kind = 'variable';
          
          // Check if it's an arrow function or function expression
          const initializer = node.getInitializer();
          if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
            kind = 'function';
          }
          
          valid = true;
        } else if (Node.isMethodDeclaration(node) && node.getName() === input.symbol) {
          name = node.getName() || '';
          kind = 'method';
          valid = true;
        } else if (Node.isPropertyDeclaration(node) && node.getName() === input.symbol) {
          name = node.getName() || '';
          kind = 'property';
          valid = true;
        }

        if (valid && name) {
          const pos = node.getStart();
          const lineAndColumn = sourceFile.getLineAndColumnAtPos(pos);
          
          // Get a small code snippet
          const nodeText = node.getText();
          const snippetLines = nodeText.split('\n');
          const snippet = snippetLines.length > 5 
            ? snippetLines.slice(0, 5).join('\n') + '\n...'
            : nodeText;
          
          definitions.push({
            filePath: sourceFile.getFilePath(),
            line: lineAndColumn.line,
            column: lineAndColumn.column,
            kind,
            snippet
          });
        }
      });
    }

    // Search for references if requested
    let references: SymbolLocation[] | undefined;
    
    if (includeReferences && definitions.length > 0) {
      references = [];
      
      for (const sourceFile of project.getSourceFiles()) {
        sourceFile.forEachDescendant((node) => {
          // Look for identifiers that match the symbol name
          if (Node.isIdentifier(node) && node.getText() === input.symbol) {
            // Make sure this isn't a definition we already captured
            const isDuplicate = definitions.some(def => {
              if (sourceFile.getFilePath() !== def.filePath) return false;
              const linePos = sourceFile.getLineStarts()[def.line - 1] + def.column - 1;
              const defNode = sourceFile.getDescendantAtPos(linePos);
              return defNode && node.getStart() === defNode.getStart();
            });
            
            if (!isDuplicate) {
              const pos = node.getStart();
              const lineAndColumn = sourceFile.getLineAndColumnAtPos(pos);
              
              // Get the surrounding code line
              const linePos = sourceFile.getLineStarts()[lineAndColumn.line - 1];
              const nextLinePos = lineAndColumn.line < sourceFile.getLineCount() 
                ? sourceFile.getLineStarts()[lineAndColumn.line]
                : sourceFile.getFullText().length;
              const lineText = sourceFile.getFullText().slice(linePos, nextLinePos);
              
              references.push({
                filePath: sourceFile.getFilePath(),
                line: lineAndColumn.line,
                column: lineAndColumn.column,
                kind: 'reference',
                snippet: lineText.trim()
              });
            }
          }
        });
      }
    }

    // Return results
    return {
      symbol: input.symbol,
      definitions,
      ...(includeReferences ? { references } : {})
    };
  } catch (error) {
    return {
      error: 'Search error',
      details: (error as Error).message
    };
  }
}
