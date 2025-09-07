/**
 * Utility to test WebSocket connection to server.py
 * This can be used to verify the configuration is working correctly
 */

import { WEBSOCKET_CONFIG, MESSAGE_TYPES } from '../config/config';

export class ServerConnectionTester {
  private ws: WebSocket | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  async testConnection(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Testing connection to: ${WEBSOCKET_CONFIG.URL}`);
        this.connectionStatus = 'connecting';
        
        this.ws = new WebSocket(WEBSOCKET_CONFIG.URL);
        
        const timeout = setTimeout(() => {
          if (this.connectionStatus !== 'connected') {
            console.error('Connection test timed out');
            this.cleanup();
            reject(new Error('Connection timeout'));
          }
        }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connection established');
          this.connectionStatus = 'connected';
          clearTimeout(timeout);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Received message:', message);
            
            if (message.type === MESSAGE_TYPES.READY) {
              console.log('✅ Server is ready');
              this.cleanup();
              resolve(true);
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          const wasConnecting = this.connectionStatus === 'connecting';
          this.connectionStatus = 'disconnected';
          clearTimeout(timeout);
          
          if (event.code === 1000) {
            // Normal closure
            resolve(true);
          } else if (wasConnecting) {
            // Failed to connect
            reject(new Error(`Connection failed: ${event.code} ${event.reason}`));
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.connectionStatus = 'error';
          clearTimeout(timeout);
          this.cleanup();
          reject(error);
        };

      } catch (error) {
        console.error('❌ Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  private cleanup() {
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close();
        }
        this.ws = null;
      } catch (error) {
        console.error('Error cleaning up WebSocket:', error);
      }
    }
  }

  getStatus() {
    return this.connectionStatus;
  }
}

// Helper function to test server.py connection
export async function testServerConnection(): Promise<void> {
  const tester = new ServerConnectionTester();
  
  try {
    console.log('🧪 Testing server.py connection...');
    await tester.testConnection();
    console.log('✅ Server connection test passed!');
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    console.log('');
    console.log('Troubleshooting steps:');
    console.log('1. Make sure server.py is running: python server.py');
    console.log('2. Check if the server is listening on port 8765');
    console.log('3. Verify the WebSocket URL in .env file');
    console.log('4. Ensure service-account.json exists in the server directory');
    throw error;
  }
}

// Helper function to log current configuration
export function logConfiguration() {
  console.log('🔧 Current Configuration:');
  console.log('  WebSocket URL:', WEBSOCKET_CONFIG.URL);
  console.log('  Reconnect Attempts:', WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS);
  console.log('  Connection Timeout:', WEBSOCKET_CONFIG.CONNECTION_TIMEOUT + 'ms');
  console.log('  Send Sample Rate:', import.meta.env.VITE_SEND_SAMPLE_RATE || '16000');
  console.log('  Receive Sample Rate:', import.meta.env.VITE_RECEIVE_SAMPLE_RATE || '24000');
  console.log('  Backend URL:', import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');
}
