import { API_CONFIG } from '../config/config';

export interface User {
  uid: string;
  email?: string;
  name?: string;
}

export interface AuthResponse {
  uid: string;
  message?: string;
  error?: string;
}

/**
 * Authentication service that communicates with the Firebase backend
 * Manages user authentication, registration, and session state
 */
export class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    // Try to restore user from localStorage on initialization
    this.restoreUserSession();
  }

  /**
   * Register a new user
   */
  async signup(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const user: User = { uid: data.uid, email };
        this.setCurrentUser(user);
        return { uid: data.uid };
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * Login an existing user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const user: User = { uid: data.uid, email };
        this.setCurrentUser(user);
        return { uid: data.uid, message: data.message };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.setCurrentUser(null);
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Save user name to the backend
   */
  async saveName(name: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/save-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: this.currentUser.uid, name }),
      });

      if (response.ok) {
        // Update local user object
        this.currentUser = { ...this.currentUser, name };
        this.saveUserSession();
        this.notifyListeners();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save name');
      }
    } catch (error) {
      console.error('Save name error:', error);
      throw error;
    }
  }

  /**
   * Get user summary from the backend
   */
  async getUserSummary(): Promise<object | null> {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/get-summary/${this.currentUser.uid}`);
      
      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        return null; // No summary found
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get summary');
      }
    } catch (error) {
      console.error('Get summary error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    
    // Immediately call with current user
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Set the current user and notify listeners
   */
  private setCurrentUser(user: User | null): void {
    this.currentUser = user;
    this.saveUserSession();
    this.notifyListeners();
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentUser));
  }

  /**
   * Save user session to localStorage
   */
  private saveUserSession(): void {
    if (this.currentUser) {
      localStorage.setItem('youthguide_user', JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem('youthguide_user');
    }
  }

  /**
   * Restore user session from localStorage
   */
  private restoreUserSession(): void {
    try {
      const savedUser = localStorage.getItem('youthguide_user');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
    } catch (error) {
      console.error('Error restoring user session:', error);
      localStorage.removeItem('youthguide_user');
    }
  }
}

// Create a singleton instance
export const authService = new AuthService();
