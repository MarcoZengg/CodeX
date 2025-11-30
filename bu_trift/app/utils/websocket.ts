import { API_URL } from "../config";

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private userId: string;
  private onMessageCallback: ((message: any) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private apiUrl: string = API_URL;
  private isManualDisconnect: boolean = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  connect(apiUrl: string = API_URL, token?: string) {
    // Get token from localStorage if not provided
    const authToken = token || localStorage.getItem("firebaseToken");
    if (!authToken) {
      console.error("No authentication token available for WebSocket connection");
      return;
    }
    
    this.apiUrl = apiUrl;
    this.isManualDisconnect = false;
    
    // Convert http:// to ws:// and https:// to wss://
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    // Include token as query parameter
    const fullUrl = `${wsUrl}/ws/${this.userId}?token=${encodeURIComponent(authToken)}`;
    
    try {
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect if not manually closed and haven't exceeded max attempts
        if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => {
            // Get fresh token for reconnection
            const freshToken = localStorage.getItem("firebaseToken");
            if (freshToken) {
              this.connect(this.apiUrl, freshToken);
            }
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  onMessage(callback: (message: any) => void) {
    this.onMessageCallback = callback;
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open. Cannot send message.');
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

