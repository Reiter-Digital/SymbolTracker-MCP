import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { FileParser } from './index';
import { 
  FileDocResponse, FunctionDoc, ClassDoc, 
  InterfaceDoc, TypeAliasDoc, RouteDoc, ReactComponentDoc,
  MethodDoc, PropertyDoc
} from './typescript';

export class JavaScriptParser implements FileParser {
  supportsFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.jsx'].includes(ext);
  }
  
  async parseFile(filePath: string): Promise<FileDocResponse> {
    // Create a ts-morph Project with allowJs option
    const project = new Project({
      compilerOptions: {
        allowJs: true,
        checkJs: true
      }
    });
    
    // Add the file to the project
    const sourceFile = project.addSourceFileAtPath(filePath);
    
    // Parse the file
    const result: FileDocResponse = {
      filePath: filePath,
      functions: this.extractFunctions(sourceFile),
      classes: this.extractClasses(sourceFile),
      routes: this.extractRoutes(sourceFile)
    };

    // Check if this is a React file
    if (path.extname(filePath).toLowerCase() === '.jsx' || this.isReactFile(sourceFile)) {
      result.reactComponents = this.extractReactComponents(sourceFile);
    }

    // Clean up empty arrays
    Object.keys(result).forEach(key => {
      const arrayKey = key as keyof FileDocResponse;
      if (Array.isArray(result[arrayKey]) && result[arrayKey]?.length === 0) {
        delete result[arrayKey];
      }
    });

    return result;
  }

  private isReactFile(sourceFile: SourceFile): boolean {
    // Check imports for React
    const importDeclarations = sourceFile.getImportDeclarations();
    return importDeclarations.some(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      return moduleSpecifier === 'react' || moduleSpecifier.startsWith('react/');
    });
  }

  private extractFunctions(sourceFile: SourceFile): FunctionDoc[] {
    const functions: FunctionDoc[] = [];
    
    // Get all function declarations
    const functionDeclarations = sourceFile.getFunctions();
    
    for (const func of functionDeclarations) {
      const name = func.getName() || '<anonymous>';
      
      // Get parameters
      const params = func.getParameters().map(param => param.getName());
      
      // Get JSDoc description if available
      const jsDocs = func.getJsDocs();
      let description: string | undefined;
      let returnType: string | undefined;
      
      if (jsDocs.length > 0) {
        description = jsDocs[0].getDescription().trim();
        
        // Look for @return or @returns tag for return type info
        const returnTag = jsDocs[0].getTags().find(tag => 
          tag.getTagName() === 'return' || tag.getTagName() === 'returns'
        );
        if (returnTag) {
          returnType = returnTag.getComment() || undefined;
        }
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
    
    // Also get arrow functions that are variable declarations
    const variableDeclarations = sourceFile.getVariableDeclarations();
    for (const varDecl of variableDeclarations) {
      const initializer = varDecl.getInitializer();
      if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
        const name = varDecl.getName();
        
        // Get parameters
        const params = initializer.getParameters().map(param => param.getName());
        
        // Get JSDoc description if available
        const jsDocs = varDecl.getJsDocs();
        let description: string | undefined;
        let returnType: string | undefined;
        
        if (jsDocs.length > 0) {
          description = jsDocs[0].getDescription().trim();
          
          // Look for @return or @returns tag for return type info
          const returnTag = jsDocs[0].getTags().find(tag => 
            tag.getTagName() === 'return' || tag.getTagName() === 'returns'
          );
          if (returnTag) {
            returnType = returnTag.getComment() || undefined;
          }
        }
        
        // Check if the variable is exported
        const exported = varDecl.isExported();
        
        functions.push({
          name,
          params,
          returnType,
          description,
          exported
        });
      }
    }
    
    return functions;
  }

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
        
        // Get JSDoc for method
        const methodJsDocs = method.getJsDocs();
        let methodDescription: string | undefined;
        let returnType: string | undefined;
        
        if (methodJsDocs.length > 0) {
          methodDescription = methodJsDocs[0].getDescription().trim();
          
          // Look for @return or @returns tag for return type info
          const returnTag = methodJsDocs[0].getTags().find(tag => 
            tag.getTagName() === 'return' || tag.getTagName() === 'returns'
          );
          if (returnTag) {
            returnType = returnTag.getComment() || undefined;
          }
        }
        
        // Get visibility
        let visibility: 'public' | 'private' | 'protected' | undefined = 'public';
        // In JS, private is often denoted by convention (underscore prefix)
        if (methodName.startsWith('_')) {
          visibility = 'private';
        }
        
        return {
          name: methodName,
          params,
          returnType,
          description: methodDescription,
          visibility
        };
      });
      
      // Extract properties (challenging in JS, but possible with JSDoc)
      const properties: PropertyDoc[] = [];
      // Look for property assignments in constructor
      const constructors = cls.getConstructors();
      if (constructors.length > 0) {
        const constructor = constructors[0];
        constructor.forEachDescendant(node => {
          if (Node.isPropertyAccessExpression(node)) {
            const left = node.getLeft();
            if (Node.isThis(left)) {
              const propName = node.getName();
              properties.push({
                name: propName,
                // Best effort at determining visibility by convention
                visibility: propName.startsWith('_') ? 'private' : 'public'
              });
            }
          }
        });
      }
      
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

  private extractRoutes(sourceFile: SourceFile): RouteDoc[] {
    const routes: RouteDoc[] = [];
    
    // Look for common patterns in Express/NextJS/etc.
    sourceFile.forEachDescendant((node) => {
      // Express-style routes
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();
        
        if (Node.isPropertyAccessExpression(expression)) {
          const methodName = expression.getName().toLowerCase();
          
          // HTTP methods in Express
          if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(methodName)) {
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
      if (Node.isFunctionDeclaration(node) && node.getName() === 'handler') {
        // Check if this is the default export
        const exportKeyword = node.getFirstAncestorByKind(SyntaxKind.ExportKeyword);
        const defaultKeyword = exportKeyword?.getNextSibling()?.getKind() === SyntaxKind.DefaultKeyword;
        
        if (exportKeyword && defaultKeyword) {
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
      }
    });
    
    return routes;
  }

  private extractReactComponents(sourceFile: SourceFile): ReactComponentDoc[] {
    const components: ReactComponentDoc[] = [];
    
    // Look for function components
    sourceFile.forEachDescendant((node) => {
      if (Node.isFunctionDeclaration(node) || Node.isArrowFunction(node)) {
        if (this.isReactFunctionComponent(node, sourceFile)) {
          const name = Node.isFunctionDeclaration(node) 
              ? node.getName() || '<anonymous>' 
              : node.getParent() && Node.isVariableDeclaration(node.getParent()) 
                ? node.getParent().getName() 
                : '<anonymous>';
          
          // Get JSDoc description
          let description: string | undefined;
          if (Node.isFunctionDeclaration(node)) {
            const jsDocs = node.getJsDocs();
            if (jsDocs.length > 0) {
              description = jsDocs[0].getDescription().trim();
            }
          } else if (node.getParent() && Node.isVariableDeclaration(node.getParent())) {
            const jsDocs = node.getParent().getJsDocs();
            if (jsDocs.length > 0) {
              description = jsDocs[0].getDescription().trim();
            }
          }
          
          // Extract props
          const propsParam = node.getParameters()[0];
          const props: PropertyDoc[] = [];
          
          if (propsParam) {
            // For JavaScript, we may have to rely on JSDoc comments or prop-types
            // Try to detect React.PropTypes usage
            node.forEachDescendant(child => {
              if (Node.isPropertyAccessExpression(child) && 
                  child.getText().includes('PropTypes')) {
                const parent = child.getParent();
                if (parent && Node.isBinaryExpression(parent) && 
                    parent.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
                  const left = parent.getLeft();
                  if (Node.isPropertyAccessExpression(left)) {
                    props.push({
                      name: left.getName(),
                      type: child.getText().replace('PropTypes.', '')
                    });
                  }
                }
              }
            });
          }
          
          // Extract React hooks
          const hooks = this.extractReactHooks(node);
          
          components.push({
            name,
            props,
            hooks,
            description
          });
        }
      }
    });
    
    // Also get class components from the classes we've already processed
    const classes = this.extractClasses(sourceFile);
    for (const cls of classes) {
      if (cls.isComponent) {
        components.push({
          name: cls.name,
          props: cls.properties.filter(prop => 
            prop.name === 'props' || prop.name === 'defaultProps'
          ),
          description: cls.description
        });
      }
    }
    
    return components;
  }

  private isReactFunctionComponent(node: any, sourceFile: SourceFile): boolean {
    // Check return statement for JSX
    let hasJsxReturn = false;
    
    node.forEachDescendant((descendant: any) => {
      if (Node.isReturnStatement(descendant) && descendant.getExpression()) {
        const returnExpr = descendant.getExpression();
        if (Node.isJsxElement(returnExpr) || Node.isJsxSelfClosingElement(returnExpr)) {
          hasJsxReturn = true;
        }
      }
    });
    
    return hasJsxReturn;
  }

  private extractReactHooks(node: any): string[] {
    const hooks: string[] = [];
    
    node.forEachDescendant((descendant: any) => {
      if (Node.isCallExpression(descendant)) {
        const expression = descendant.getExpression();
        if (Node.isIdentifier(expression)) {
          const name = expression.getText();
          // Common React hooks
          if (name.startsWith('use') && /^use[A-Z]/.test(name)) {
            hooks.push(name);
          }
        }
      }
    });
    
    return [...new Set(hooks)]; // Remove duplicates
  }
}
