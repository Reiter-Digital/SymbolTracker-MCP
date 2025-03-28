import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { FileParser } from './index';

// Documentation interfaces
export interface FunctionDoc {
  name: string;
  params: string[];
  returnType?: string;
  description?: string;
  exported: boolean;
}

export interface MethodDoc {
  name: string;
  params: string[];
  returnType?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'protected';
}

export interface PropertyDoc {
  name: string;
  type?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'protected';
}

export interface ClassDoc {
  name: string;
  description?: string;
  exported: boolean;
  methods: MethodDoc[];
  properties: PropertyDoc[];
  isComponent?: boolean; // For React components
}

export interface InterfaceDoc {
  name: string;
  description?: string;
  exported: boolean;
  properties: PropertyDoc[];
  methods: MethodDoc[];
}

export interface TypeAliasDoc {
  name: string;
  type: string;
  description?: string;
  exported: boolean;
}

export interface RouteDoc {
  method?: string;
  path?: string;
  handler?: string;
  description?: string;
}

export interface ReactComponentDoc {
  name: string;
  props?: PropertyDoc[];
  state?: PropertyDoc[];
  hooks?: string[]; // Used React hooks
  description?: string;
}

export interface FileDocResponse {
  filePath: string;
  functions?: FunctionDoc[];
  classes?: ClassDoc[];
  interfaces?: InterfaceDoc[];
  typeAliases?: TypeAliasDoc[];
  routes?: RouteDoc[];
  reactComponents?: ReactComponentDoc[];
}

export class TypeScriptParser implements FileParser {
  supportsFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx'].includes(ext);
  }
  
  async parseFile(filePath: string): Promise<FileDocResponse> {
    // Create a ts-morph Project
    const project = new Project();
    
    // Add the file to the project
    const sourceFile = project.addSourceFileAtPath(filePath);
    
    // Parse the file
    const result: FileDocResponse = {
      filePath: filePath,
      functions: this.extractFunctions(sourceFile),
      classes: this.extractClasses(sourceFile),
      interfaces: this.extractInterfaces(sourceFile),
      typeAliases: this.extractTypeAliases(sourceFile),
      routes: this.extractRoutes(sourceFile)
    };

    // Check if this is a React file
    if (path.extname(filePath).toLowerCase() === '.tsx' || this.isReactFile(sourceFile)) {
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
      
      // Get return type
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
    
    // Also get arrow functions that are variable declarations
    const variableDeclarations = sourceFile.getVariableDeclarations();
    for (const varDecl of variableDeclarations) {
      const initializer = varDecl.getInitializer();
      if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
        const name = varDecl.getName();
        
        // Get parameters
        const params = initializer.getParameters().map(param => param.getName());
        
        // Get return type
        const returnType = initializer.getReturnType().getText();
        
        // Get JSDoc description if available
        const jsDocs = varDecl.getJsDocs();
        let description: string | undefined;
        
        if (jsDocs.length > 0) {
          description = jsDocs[0].getDescription().trim();
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

  private extractInterfaces(sourceFile: SourceFile): InterfaceDoc[] {
    const interfaces: InterfaceDoc[] = [];
    
    // Get all interface declarations
    const interfaceDeclarations = sourceFile.getInterfaces();
    
    for (const iface of interfaceDeclarations) {
      const name = iface.getName();
      
      // Get JSDoc description if available
      const jsDocs = iface.getJsDocs();
      let description: string | undefined;
      
      if (jsDocs.length > 0) {
        description = jsDocs[0].getDescription().trim();
      }
      
      // Check if the interface is exported
      const exported = iface.isExported();
      
      // Extract properties
      const properties: PropertyDoc[] = iface.getProperties().map(prop => {
        const propName = prop.getName();
        const propType = prop.getType().getText();
        
        // Get JSDoc for property
        const propJsDocs = prop.getJsDocs();
        let propDescription: string | undefined;
        
        if (propJsDocs.length > 0) {
          propDescription = propJsDocs[0].getDescription().trim();
        }
        
        return {
          name: propName,
          type: propType,
          description: propDescription
        };
      });
      
      // Extract methods
      const methods: MethodDoc[] = iface.getMethods().map(method => {
        const methodName = method.getName();
        const params = method.getParameters().map(param => param.getName());
        const returnType = method.getReturnType().getText();
        
        // Get JSDoc for method
        const methodJsDocs = method.getJsDocs();
        let methodDescription: string | undefined;
        
        if (methodJsDocs.length > 0) {
          methodDescription = methodJsDocs[0].getDescription().trim();
        }
        
        return {
          name: methodName,
          params,
          returnType,
          description: methodDescription
        };
      });
      
      interfaces.push({
        name,
        description,
        exported,
        properties,
        methods
      });
    }
    
    return interfaces;
  }

  private extractTypeAliases(sourceFile: SourceFile): TypeAliasDoc[] {
    const typeAliases: TypeAliasDoc[] = [];
    
    // Get all type alias declarations
    const typeAliasDeclarations = sourceFile.getTypeAliases();
    
    for (const typeAlias of typeAliasDeclarations) {
      const name = typeAlias.getName();
      const type = typeAlias.getType().getText();
      
      // Get JSDoc description if available
      const jsDocs = typeAlias.getJsDocs();
      let description: string | undefined;
      
      if (jsDocs.length > 0) {
        description = jsDocs[0].getDescription().trim();
      }
      
      // Check if the type alias is exported
      const exported = typeAlias.isExported();
      
      typeAliases.push({
        name,
        type,
        description,
        exported
      });
    }
    
    return typeAliases;
  }

  private extractRoutes(sourceFile: SourceFile): RouteDoc[] {
    const routes: RouteDoc[] = [];
    
    // Look for common patterns in Express/NextJS/etc.
    // Express: app.get('/path', handler)
    // NextJS: export default function handler(req, res) { ... }
    
    // This is a more enhanced version that detects more patterns
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
      
      // NestJS style decorators
      if (Node.isDecorator(node)) {
        const call = node.getCallExpression();
        if (call) {
          const expression = call.getExpression();
          if (Node.isIdentifier(expression)) {
            const decoratorName = expression.getText();
            
            // HTTP method decorators in NestJS
            if (['Get', 'Post', 'Put', 'Delete', 'Patch', 'Options', 'Head'].includes(decoratorName)) {
              const args = call.getArguments();
              if (args.length > 0 && Node.isStringLiteral(args[0])) {
                const path = args[0].getLiteralText();
                
                // Get the method the decorator is attached to
                const parent = node.getParent();
                let handler = '';
                
                if (Node.isMethodDeclaration(parent)) {
                  handler = parent.getName();
                }
                
                routes.push({
                  method: decoratorName.toUpperCase(),
                  path,
                  handler,
                  description: `${decoratorName.toUpperCase()} ${path}`
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
            const propsType = propsParam.getType();
            const properties = propsType.getProperties();
            
            for (const prop of properties) {
              props.push({
                name: prop.getName(),
                type: prop.getValueDeclaration()?.getType().getText() || 'unknown',
                description: undefined // We don't have direct access to JSDoc for individual props
              });
            }
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
        // Find props from class properties
        const props = cls.properties.filter(prop => 
          prop.name === 'props' || prop.name === 'defaultProps'
        );
        
        components.push({
          name: cls.name,
          props: props,
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
