/**
 * Interface for a function documentation
 */
export interface FunctionDoc {
  name: string;
  params: string[];
  returnType?: string;
  description?: string;
  exported: boolean;
}

/**
 * Interface for a method documentation
 */
export interface MethodDoc {
  name: string;
  params: string[];
  returnType?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'protected';
}

/**
 * Interface for a property documentation
 */
export interface PropertyDoc {
  name: string;
  type?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'protected';
}

/**
 * Interface for a class documentation
 */
export interface ClassDoc {
  name: string;
  description?: string;
  exported: boolean;
  methods: MethodDoc[];
  properties: PropertyDoc[];
  isComponent?: boolean; // For React components
}

/**
 * Interface for an interface documentation
 */
export interface InterfaceDoc {
  name: string;
  description?: string;
  exported: boolean;
  properties: PropertyDoc[];
  methods: MethodDoc[];
}

/**
 * Interface for a type alias documentation
 */
export interface TypeAliasDoc {
  name: string;
  type: string;
  description?: string;
  exported: boolean;
}

/**
 * Interface for a route documentation (if applicable)
 */
export interface RouteDoc {
  method?: string;
  path?: string;
  handler?: string;
  description?: string;
}

/**
 * Interface for the combined file documentation response
 */
export interface FileDocResponse {
  filePath: string;
  functions?: FunctionDoc[];
  classes?: ClassDoc[];
  interfaces?: InterfaceDoc[];
  typeAliases?: TypeAliasDoc[];
  routes?: RouteDoc[];
}

/**
 * Interface for error responses
 */
export interface ErrorResponse {
  error: string;
  details?: string;
}
