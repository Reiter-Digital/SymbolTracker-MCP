/**
 * A sample TypeScript file to test the MCP DevDocs Server
 */

/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Represents a user in the system
 */
export interface User {
  /** User's unique identifier */
  id: string;
  /** User's full name */
  name: string;
  /** User's email address */
  email: string;
  /** Check if user's email is verified */
  isEmailVerified(): boolean;
}

/**
 * Represents a person with age and address
 */
export type Person = {
  name: string;
  age: number;
  address?: string;
};

/**
 * A class that manages user authentication
 */
export class AuthManager {
  /** List of logged in users */
  private users: Map<string, User>;
  
  /**
   * Creates a new AuthManager instance
   */
  constructor() {
    this.users = new Map();
  }
  
  /**
   * Logs in a user
   * @param user The user to log in
   * @returns Success status
   */
  public login(user: User): boolean {
    this.users.set(user.id, user);
    return true;
  }
  
  /**
   * Logs out a user
   * @param userId The ID of the user to log out
   */
  public logout(userId: string): void {
    this.users.delete(userId);
  }
  
  /**
   * Checks if a user is logged in
   * @param userId The user ID to check
   * @returns Whether the user is logged in
   */
  protected isLoggedIn(userId: string): boolean {
    return this.users.has(userId);
  }
}

// Sample Express-like route
interface Request {}
interface Response {}

interface App {
  get: (path: string, handler: (req: Request, res: Response) => void) => void;
  post: (path: string, handler: (req: Request, res: Response) => void) => void;
}

const app: App = {
  get: (path: string, handler: (req: Request, res: Response) => void) => {},
  post: (path: string, handler: (req: Request, res: Response) => void) => {}
};

app.get('/api/users', (req: Request, res: Response) => {
  // Get all users
});

app.post('/api/users', (req: Request, res: Response) => {
  // Create a new user
});
