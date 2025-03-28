import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';

// Interface for the input
export interface GetDocForFileInput {
  file: string;
}

// Error response interface
interface ErrorResponse {
  error: string;
  details?: string;
}

// Interface for a function documentation
interface FunctionDoc {
  name: string;
  params: string[];
  returnType?: string;
  description?: string;
  exported: boolean;
}

// Interface for a method documentation
interface MethodDoc {
  name: string;
  params: string[];
  returnType?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'protected';
}

// Interface for a property documentation
interface PropertyDoc {
  name: string;
  type?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'protected';
}

// Interface for a class documentation
interface ClassDoc {
  name: string;
  description?: string;
  exported: boolean;
  methods: MethodDoc[];
  properties: PropertyDoc[];
}

// Interface for an interface documentation
interface InterfaceDoc {
  name: string;
  description?: string;
  exported: boolean;
  properties: PropertyDoc[];
  methods: MethodDoc[];
}

// Interface for a type alias documentation
interface TypeAliasDoc {
  name: string;
  type: string;
  description?: string;
  exported: boolean;
}

// Interface for a route documentation (if applicable)
interface RouteDoc {
  method?: string;
  path?: string;
  handler?: string;
  description?: string;
}

// Combined response interface
interface FileDocResponse {
  filePath: string;
  functions?: FunctionDoc[];
  classes?: ClassDoc[];
  interfaces?: InterfaceDoc[];
  typeAliases?: TypeAliasDoc[];
  routes?: RouteDoc[];
}

/**
 * Extracts documentation from a TypeScript or JavaScript file
 * @param input The input object containing the file path
 * @returns Structured documentation or error response
 */
export async function getDocForFile(input: GetDocForFileInput): Promise<FileDocResponse | ErrorResponse> {
  // Validate input
  if (!input.file || typeof input.file !== 'string') {
    return {
      error: 'Invalid input',
      details: 'Missing or invalid "file" field'
    };
  }

  const filePath = path.resolve(input.file);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {
      error: 'File not found',
      details: `File not found at path: ${filePath}`
    };
  }

  // Check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    return {
      error: 'Unsupported file type',
      details: `Only TypeScript (.ts, .tsx) and JavaScript (.js, .jsx) files are supported. Got: ${ext}`
    };
  }

  try {
    // Create a ts-morph Project with appropriate compiler options
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
      filePath: input.file,
      functions: extractFunctions(sourceFile),
      classes: extractClasses(sourceFile),
      interfaces: extractInterfaces(sourceFile),
      typeAliases: extractTypeAliases(sourceFile),
      routes: extractRoutes(sourceFile)
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
function extractFunctions(sourceFile: SourceFile): FunctionDoc[] {
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
  
  return functions;
}

/**
 * Extract classes from a source file
 */
function extractClasses(sourceFile: SourceFile): ClassDoc[] {
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
    
    classes.push({
      name,
      description,
      exported,
      methods,
      properties
    });
  }
  
  return classes;
}

/**
 * Extract interfaces from a source file
 */
function extractInterfaces(sourceFile: SourceFile): InterfaceDoc[] {
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

/**
 * Extract type aliases from a source file
 */
function extractTypeAliases(sourceFile: SourceFile): TypeAliasDoc[] {
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

/**
 * Try to extract routes from a source file
 * This is more heuristic-based and may not work for all frameworks
 */
function extractRoutes(sourceFile: SourceFile): RouteDoc[] {
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
