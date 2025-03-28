import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { 
  FileDocResponse, FunctionDoc, ClassDoc, 
  RouteDoc, MethodDoc, PropertyDoc, ErrorResponse 
} from '../types';
import { FileParser } from './index';

/**
 * Parser for JavaScript files
 */
export class JavaScriptParser implements FileParser {
  /**
   * Check if this parser supports the given file
   * @param filePath Path to the file
   * @returns Whether this parser can handle the file
   */
  supportsFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.jsx'].includes(ext);
  }

  /**
   * Parse a JavaScript file and extract documentation
   * @param filePath Path to the file to parse
   * @returns Structured documentation about the file
   */
  async parseFile(filePath: string): Promise<FileDocResponse | ErrorResponse> {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        error: 'File not found',
        details: `File not found at path: ${filePath}`
      };
    }

    try {
      // Create a ts-morph Project with JavaScript support
      const project = new Project({
        compilerOptions: {
          allowJs: true,  // Allow JavaScript files
          checkJs: true,  // Enable type checking for JavaScript files
        }
      });
      
      // Add the file to the project
      const sourceFile = project.addSourceFileAtPath(filePath);
      
      // Parse the file
      const result: FileDocResponse = {
        filePath,
        functions: this.extractFunctions(sourceFile),
        classes: this.extractClasses(sourceFile),
        routes: this.extractRoutes(sourceFile)
      };

      // Clean up empty arrays
      Object.keys(result).forEach(key => {
        const arrayKey = key as keyof FileDocResponse;
        if (Array.isArray(result[arrayKey]) && result[arrayKey]?.length === 0) {
          delete result[arrayKey];
        }
      });

      return result;
    } catch (error) {
      return {
        error: 'Parsing error',
        details: (error as Error).message
      };
    }
  }

  /**
   * Extract functions from a source file
   */
  private extractFunctions(sourceFile: SourceFile): FunctionDoc[] {
    const functions: FunctionDoc[] = [];
    
    // Get all function declarations
    const functionDeclarations = sourceFile.getFunctions();
    
    for (const func of functionDeclarations) {
      const name = func.getName() || '<anonymous>';
      
      // Get parameters
      const params = func.getParameters().map(param => param.getName());
      
      // Get return type (may be 'any' for JavaScript)
      const returnType = func.getReturnType().getText();
      
      // Get JSDoc description if available
      const jsDocs = func.getJsDocs();
      let description: string | undefined;
      
      if (jsDocs.length > 0) {
        description = jsDocs[0].getDescription().trim();
      }
      
      // Check if the function is exported
      const exported = func.isExported();
      
      functions.push({
        name,
        params,
        returnType,
        description,
        exported
      });
    }
    
    return functions;
  }

  /**
   * Extract classes from a source file
   */
  private extractClasses(sourceFile: SourceFile): ClassDoc[] {
    const classes: ClassDoc[] = [];
    
    // Get all class declarations
    const classDeclarations = sourceFile.getClasses();
    
    for (const cls of classDeclarations) {
      const name = cls.getName() || '<anonymous>';
      
      // Get JSDoc description if available
      const jsDocs = cls.getJsDocs();
      let description: string | undefined;
      
      if (jsDocs.length > 0) {
        description = jsDocs[0].getDescription().trim();
      }
      
      // Check if the class is exported
      const exported = cls.isExported();
      
      // Extract methods
      const methods: MethodDoc[] = cls.getMethods().map(method => {
        const methodName = method.getName();
        const params = method.getParameters().map(param => param.getName());
        const returnType = method.getReturnType().getText();
        
        // Get JSDoc for method
        const methodJsDocs = method.getJsDocs();
        let methodDescription: string | undefined;
        
        if (methodJsDocs.length > 0) {
          methodDescription = methodJsDocs[0].getDescription().trim();
        }
        
        // Get visibility
        let visibility: 'public' | 'private' | 'protected' | undefined;
        if (method.hasModifier(SyntaxKind.PrivateKeyword)) {
          visibility = 'private';
        } else if (method.hasModifier(SyntaxKind.ProtectedKeyword)) {
          visibility = 'protected';
        } else {
          visibility = 'public';
        }
        
        return {
          name: methodName,
          params,
          returnType,
          description: methodDescription,
          visibility
        };
      });
      
      // Extract properties
      const properties: PropertyDoc[] = cls.getProperties().map(prop => {
        const propName = prop.getName();
        const propType = prop.getType().getText();
        
        // Get JSDoc for property
        const propJsDocs = prop.getJsDocs();
        let propDescription: string | undefined;
        
        if (propJsDocs.length > 0) {
          propDescription = propJsDocs[0].getDescription().trim();
        }
        
        // Get visibility
        let visibility: 'public' | 'private' | 'protected' | undefined;
        if (prop.hasModifier(SyntaxKind.PrivateKeyword)) {
          visibility = 'private';
        } else if (prop.hasModifier(SyntaxKind.ProtectedKeyword)) {
          visibility = 'protected';
        } else {
          visibility = 'public';
        }
        
        return {
          name: propName,
          type: propType,
          description: propDescription,
          visibility
        };
      });
      
      // Check if this is likely a React component
      const isComponent = this.isReactComponent(cls);
      
      classes.push({
        name,
        description,
        exported,
        methods,
        properties,
        isComponent
      });
    }
    
    return classes;
  }

  /**
   * Check if a class is likely a React component
   */
  private isReactComponent(cls: any): boolean {
    // Check if it extends React.Component or Component
    const extendsClause = cls.getExtends();
    if (extendsClause) {
      const baseClass = extendsClause.getText();
      if (baseClass.includes('React.Component') || baseClass.includes('Component')) {
        return true;
      }
    }
    
    // Check if it has a render method
    const methods = cls.getMethods();
    const hasRenderMethod = methods.some((method: any) => method.getName() === 'render');
    
    return hasRenderMethod;
  }

  /**
   * Try to extract routes from a source file
   * This is more heuristic-based and may not work for all frameworks
   */
  private extractRoutes(sourceFile: SourceFile): RouteDoc[] {
    const routes: RouteDoc[] = [];
    
    // Look for common patterns in Express/NextJS/etc.
    // Express: app.get('/path', handler)
    // NextJS: export default function handler(req, res) { ... }
    
    // This is a simple heuristic approach that will need customization based on frameworks
    sourceFile.forEachDescendant((node) => {
      // Express-style routes
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();
        
        if (Node.isPropertyAccessExpression(expression)) {
          const methodName = expression.getName();
          if (['get', 'post', 'put', 'delete', 'patch'].includes(methodName)) {
            const args = node.getArguments();
            
            if (args.length >= 2) {
              const pathArg = args[0];
              if (Node.isStringLiteral(pathArg)) {
                const path = pathArg.getLiteralText();
                
                // Get handler name or description
                let handler = '';
                const secondArg = args[1];
                
                if (Node.isIdentifier(secondArg)) {
                  handler = secondArg.getText();
                } else if (Node.isFunctionExpression(secondArg) || Node.isArrowFunction(secondArg)) {
                  handler = '<inline function>';
                }
                
                routes.push({
                  method: methodName.toUpperCase(),
                  path,
                  handler,
                  description: `${methodName.toUpperCase()} ${path}`
                });
              }
            }
          }
        }
      }
      
      // NextJS API route handlers
      if (Node.isFunctionDeclaration(node) && node.getName() === 'handler' && node.isExported()) {
        const sourceFilePath = sourceFile.getFilePath();
        const apiPath = sourceFilePath
          .replace(/^.*\/pages\/api\//, '/')
          .replace(/\.[jt]sx?$/, '')
          .replace(/\/index$/, '/');
        
        routes.push({
          method: 'ANY', // NextJS handlers can handle any method by default
          path: apiPath,
          handler: 'handler',
          description: `API route for ${apiPath}`
        });
      }
    });
    
    return routes;
  }
}
