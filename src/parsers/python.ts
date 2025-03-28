import * as fs from 'fs';
import * as path from 'path';
import Parser from 'tree-sitter';
import { FileParser } from './index';
import { FileDocResponse, ErrorResponse, FunctionDoc, ClassDoc, MethodDoc, RouteDoc } from '../types';

// For tree-sitter Python grammar
let pythonGrammar: any;
try {
  pythonGrammar = require('tree-sitter-python');
} catch (e) {
  console.error('Failed to load tree-sitter-python. Python parsing will be disabled.', e);
}

/**
 * Parser implementation for Python files
 */
export class PythonParser implements FileParser {
  private parser: Parser | null = null;

  constructor() {
    if (pythonGrammar) {
      this.parser = new Parser();
      this.parser.setLanguage(pythonGrammar);
    }
  }

  /**
   * Check if this parser supports the given file based on its extension
   * @param filePath Path to the file
   * @returns True if this parser can handle the file
   */
  supportsFile(filePath: string): boolean {
    // Only support Python files if the grammar is loaded
    if (!pythonGrammar || !this.parser) {
      return false;
    }
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.py';
  }

  /**
   * Parse a file and extract documentation information
   * @param filePath Path to the file to parse
   * @returns Parsed file documentation or error response
   */
  async parseFile(filePath: string): Promise<FileDocResponse | ErrorResponse> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Add null check for parser
      if (!this.parser) {
        return {
          error: 'Python parser not initialized',
          details: 'tree-sitter-python grammar failed to load.'
        };
      }
      const tree = this.parser.parse(content);
      const rootNode = tree.rootNode;
      const functions: FunctionDoc[] = [];
      const classes: ClassDoc[] = [];
      const routes: RouteDoc[] = [];
      let moduleDescription = '';

      // Attempt to get module docstring
      if (rootNode.namedChildCount > 0) {
        const firstChild = rootNode.namedChild(0);
        if (firstChild && firstChild.type === 'expression_statement') {
          const expr = firstChild.firstChild;
          if (expr && (expr.type === 'string' || expr.type.includes('string'))) {
            moduleDescription = this.cleanDocstring(expr.text);
          }
        }
      }

      // Process only top-level children of the module
      rootNode.children.forEach(node => {
        if (node.type === 'function_definition') {
          // Extract details for top-level functions
          const funcDoc = this.extractFunctionDetails(node, content, moduleDescription, false); // isMethod = false
          if (funcDoc) {
            functions.push(funcDoc);
          }
        } else if (node.type === 'decorated_definition') {
          // Find the actual function definition within the decorated definition
          const funcDefNode = node.children.find(child => child.type === 'function_definition');
          if (funcDefNode) {
            const funcDoc = this.extractFunctionDetails(funcDefNode, content, moduleDescription, false);
            if (funcDoc) {
              functions.push(funcDoc);
              // Now, check the decorators on this definition for routes
              this.extractRouteFromDecorators(node, funcDoc, routes);
            }
          }
        } else if (node.type === 'class_definition') {
          // Process classes and their methods
          this.processClasses(node, content, classes, moduleDescription); // processClasses will handle its methods
        }
        // Add handling for other top-level constructs if needed (e.g., assignments for constants)
      });

      // Note: findRoutes logic might be better integrated into decorator processing
      // this.findRoutes(rootNode, functions, classes, routes);

      // Return the structured file documentation
      return {
        filePath,
        functions,
        classes,
        routes
      };
    } catch (error) {
      console.error(`Error parsing Python file ${filePath}:`, error);
      return {
        error: 'Error parsing file',
        details: (error as Error).message
      };
    }
  }

  /**
   * Clean a docstring by removing quotes and indentation
   * @param text Raw docstring text
   * @returns Cleaned docstring
   */
  private cleanDocstring(text: string): string {
    // Remove triple quotes
    let result = text.replace(/^['\"]['\"]['\"]|['\"]['\"]['\"]$/g, '');
    // Remove single quotes
    result = result.replace(/^['\"]|['\"]$/g, '');

    // Handle multiline docstrings
    const lines = result.split('\n');
    if (lines.length <= 1) return result.trim();

    // Find minimum indentation
    let minIndent = Infinity;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\s*/);
      const indent = match ? match[0].length : 0;
      if (line.trim() !== '' && indent < minIndent) {
        minIndent = indent;
      }
    }

    // Remove common indentation
    if (minIndent < Infinity) {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].length >= minIndent) {
          lines[i] = lines[i].substring(minIndent);
        }
      }
    }

    return lines.join('\n').trim();
  }

  /**
   * Extracts details for a single function or method definition node.
   * Helper function to avoid code duplication between top-level functions and class methods.
   * @param node The function_definition node.
   * @param content The full file content string.
   * @param defaultDescription Default description (module or class docstring) if function has no docstring.
   * @param isMethod Flag indicating if this is a class method (to handle self/cls skipping).
   */
  private extractFunctionDetails(node: Parser.SyntaxNode, content: string, defaultDescription: string, isMethod: boolean): FunctionDoc | null {
    if (node.type !== 'function_definition') return null;

    const nameNode = node.childForFieldName('name');
    if (!nameNode) return null;

    const funcName = nameNode.text;
    // Exported status for top-level functions, methods handled by visibility
    const exported = !isMethod && !funcName.startsWith('_');

    // Extract parameters more reliably
    const params: string[] = [];
    const parameterList = node.childForFieldName('parameters');
    if (parameterList) {
      // Filter children to only include actual parameter nodes
      const parameterNodes = parameterList.children.filter(p => 
        p.type === 'identifier' || 
        p.type === 'typed_parameter' || 
        p.type === 'default_parameter' || 
        p.type === 'typed_default_parameter' ||
        p.type === 'list_splat_pattern' || // *args
        p.type === 'dictionary_splat_pattern' // **kwargs
      );

      // Iterate over the filtered parameter nodes
      parameterNodes.forEach((param, index) => {
        let paramNameNode: Parser.SyntaxNode | null = null;
        let paramNameText: string | null = null;

        // Extract the node containing the parameter name based on the parameter type
        // For splats, the interesting part might be nested
        if (param.type === 'identifier' || param.type === 'typed_parameter') {
          paramNameNode = param.type === 'identifier' ? param : param.child(0);
        } else if (param.type === 'default_parameter' || param.type === 'typed_default_parameter') {
          paramNameNode = param.childForFieldName('name');
        } else if (param.type === 'list_splat_pattern' || param.type === 'dictionary_splat_pattern') {
            // For *args or **kwargs, the name node is usually the first named child
            paramNameNode = param.namedChild(0);
        }
        // Add other parameter types if needed

        // Get the text name if the node was found
        if (paramNameNode) {
          paramNameText = paramNameNode.text;

          // If it's a method, skip the first parameter ONLY if its name is 'self' or 'cls'
          if (isMethod && index === 0 && (paramNameText === 'self' || paramNameText === 'cls')) {
            // Intentionally skip
          } else {
            // Only add if paramNameText is not null/empty
            if (paramNameText) {
              params.push(paramNameText);
            }
          }
        }
      });
    }

    // Extract return type if specified
    let returnType = 'any';
    const returnTypeNode = node.childForFieldName('return_type');
    if (returnTypeNode) {
      returnType = content.substring(returnTypeNode.startIndex, returnTypeNode.endIndex).trim();
    }

    // Extract docstring
    let description = '';
    let foundDocstring = false;
    const bodyNode = node.childForFieldName('body');
    if (bodyNode && bodyNode.namedChildCount > 0) {
      const firstStmt = bodyNode.namedChild(0);
      if (firstStmt && firstStmt.type === 'expression_statement') {
        const expr = firstStmt.firstChild;
        if (expr && (expr.type === 'string' || expr.type.includes('string'))) {
          description = this.cleanDocstring(expr.text);
          foundDocstring = true;
        }
      }
    }

    // If it's a method and we didn't find a specific docstring, clear the description
    if (isMethod && !foundDocstring) {
      description = ''; // Or perhaps null, depending on desired output
    } else if (!isMethod) {
      description = description || defaultDescription;
    }

    // Return the extracted details
    return {
      name: funcName,
      params,
      returnType,
      description,
      exported // Only relevant for top-level functions
    };
  }

  /**
   * Processes class definition nodes and extracts relevant documentation.
   */
  private processClasses(node: Parser.SyntaxNode, content: string, classes: ClassDoc[], moduleDescription: string): void {
    // Ensure the input node is a class_definition
    if (node.type !== 'class_definition') return;

    const classNameNode = node.childForFieldName('name');
    if (!classNameNode) return;

    const className = classNameNode.text;
    const exported = !className.startsWith('_');
    const methods: MethodDoc[] = [];
    let classDescription = moduleDescription;
    const isComponent = false; // Python classes are generally not UI components

    const classBody = node.childForFieldName('body');
    if (classBody) {
      // Extract class docstring
      if (classBody.namedChildCount > 0) {
        const firstStmt = classBody.namedChild(0);
        if (firstStmt && firstStmt.type === 'expression_statement') {
          const expr = firstStmt.firstChild;
          if (expr && (expr.type === 'string' || expr.type.includes('string'))) {
            classDescription = this.cleanDocstring(expr.text);
          }
        }
      }

      // Find methods within the class body
      this.traverseNode(classBody, (child) => {
        if (child.type === 'function_definition') {
          // Use the helper function to extract method details
          const methodDetails = this.extractFunctionDetails(child, content, classDescription, true); // isMethod = true

          if (methodDetails) {
            // Determine visibility based on name convention
            let visibility: 'public' | 'protected' | 'private' = 'public';
            const methodName = methodDetails.name;
            if (methodName.startsWith('__') && methodName !== '__init__') {
              visibility = 'private';
            } else if (methodName.startsWith('_') && methodName !== '__init__') {
              visibility = 'protected';
            } else if (methodName === '__init__') {
              visibility = 'private'; // Treat __init__ as private for simplicity
            }

            methods.push({
              name: methodName,
              params: methodDetails.params, // Already processed by extractFunctionDetails
              returnType: methodDetails.returnType,
              description: methodDetails.description,
              visibility: visibility
            });
          }
          return true; // Stop traversing deeper into the method itself
        }
        return true; // Continue traversal within class body
      });
    }

    // Add the processed class to the list
    classes.push({
      name: className,
      methods,
      properties: [], // Properties might require parsing assignments in __init__ or class body
      description: classDescription,
      exported,
      isComponent
    });
  }

  /**
   * Extracts route information from decorators applied to a function definition node.
   */
  private extractRouteFromDecorators(node: Parser.SyntaxNode, funcDoc: FunctionDoc, routes: RouteDoc[]): void {
    node.children.filter(c => c.type === 'decorator').forEach(decorator => {
      const callNode = decorator.children.find(c => c.type === 'call');
      if (!callNode) {
        return;
      }

      const funcNameNode = callNode.childForFieldName('function');
      const argsNode = callNode.childForFieldName('arguments');
      
      if (!funcNameNode || !argsNode) {
        return;
      }

      const decoratorName = funcNameNode.text;
      let httpMethod = 'GET'; // Default
      let isRouteDecorator = false;
      
      if (decoratorName.endsWith('.route')) {
        isRouteDecorator = true;
        const methodsArg = argsNode.children.find(arg => arg.type === 'keyword_argument' && arg.childForFieldName('name')?.text === 'methods');
        if (methodsArg) {
          const methodList = methodsArg.childForFieldName('value');
          if (methodList && methodList.type === 'list' && methodList.firstChild?.type === 'string') {
            httpMethod = this.cleanDocstring(methodList.firstChild.text);
          }
        }
      } else if ([ '.get', '.post', '.put', '.delete', '.patch' ].some(m => decoratorName.endsWith(m))) {
        isRouteDecorator = true;
        httpMethod = decoratorName.split('.').pop()?.toUpperCase() ?? 'GET';
      }
      
      if (isRouteDecorator) {
        const pathArg = argsNode.children.find(arg => arg.type === 'string');
        if (pathArg) {
          const path = this.cleanDocstring(pathArg.text);
          routes.push({
            method: httpMethod,
            path: path,
            handler: funcDoc.name,
            description: funcDoc.description 
          });
        } 
      } 
    });
  }

  private traverseNode(node: Parser.SyntaxNode, callback: (child: Parser.SyntaxNode) => boolean): void {
    if (callback(node)) {
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (child) { 
          this.traverseNode(child, callback);
        }
      }
    }
  }
}
