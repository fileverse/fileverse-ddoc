// Ollama API Client
// This client script provides an interface to communicate with the Ollama service worker

class OllamaClient {
  constructor() {
    this.workerReady = false;
    this.endpoint = 'http://localhost:11434';
    this.serviceWorkerPath = '/ollama-worker.js';
    this.registration = null;
  }

  /**
   * Initialize the Ollama client and register the service worker
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async init() {
    try {
      if (!('serviceWorker' in navigator)) {
        console.error('Service workers are not supported in this browser');
        return false;
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register(this.serviceWorkerPath);
      console.log('Ollama service worker registered:', this.registration.scope);

      // Wait for the service worker to be ready
      if (navigator.serviceWorker.controller) {
        this.workerReady = true;
      } else {
        // Wait for the service worker to take control
        await new Promise(resolve => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.workerReady = true;
            resolve();
          });
        });
      }

      // Ping the service worker to check if it's active
      await this.pingWorker();

      // Set the Ollama endpoint in the service worker
      this.setEndpoint(this.endpoint);

      return true;
    } catch (error) {
      console.error('Failed to initialize Ollama client:', error);
      return false;
    }
  }

  /**
   * Ping the service worker to check if it's active
   * @returns {Promise<boolean>} True if the worker responded
   */
  async pingWorker() {
    if (!this.workerReady || !navigator.serviceWorker.controller) {
      return false;
    }

    try {
      return new Promise(resolve => {
        const channel = new MessageChannel();
        
        // Set up the response handler
        channel.port1.onmessage = event => {
          if (event.data && event.data.type === 'PONG') {
            console.log('Service worker response:', event.data.message);
            resolve(true);
          } else {
            resolve(false);
          }
        };

        // Send the ping message
        navigator.serviceWorker.controller.postMessage({
          type: 'PING'
        }, [channel.port2]);

        // Timeout after 3 seconds
        setTimeout(() => resolve(false), 3000);
      });
    } catch (error) {
      console.error('Error pinging service worker:', error);
      return false;
    }
  }

  /**
   * Set the Ollama API endpoint
   * @param {string} endpoint The Ollama API endpoint URL
   */
  setEndpoint(endpoint) {
    this.endpoint = endpoint;
    
    if (this.workerReady && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_ENDPOINT',
        endpoint
      });
    }
  }

  /**
   * Call the Ollama API through the service worker
   * @param {string} path API path (without leading slash)
   * @param {Object} options Fetch options
   * @returns {Promise<Response>} The API response
   */
  async callApi(path, options = {}) {
    if (!this.workerReady) {
      await this.init();
    }

    try {
      // Prefix the path with /ollama-api to route through the service worker
      const url = new URL(`/ollama-api/${path}`, window.location.origin);
      
      // Make the API call through the service worker
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error(`Error calling Ollama API (${path}):`, error);
      throw error;
    }
  }

  /**
   * Check if Ollama is available
   * @returns {Promise<boolean>} True if Ollama is available
   */
  async isAvailable() {
    try {
      const response = await this.callApi('api/version');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the list of available models
   * @returns {Promise<Array>} The list of available models
   */
  async listModels() {
    try {
      const response = await this.callApi('api/tags');
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }

  /**
   * Generate a completion from Ollama
   * @param {Object} params The generation parameters
   * @returns {Promise<Object>} The generation response
   */
  async generate(params) {
    try {
      const response = await this.callApi('api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }

  /**
   * Send a chat message to Ollama
   * @param {Object} params The chat parameters
   * @returns {Promise<Object>} The chat response
   */
  async chat(params) {
    try {
      const response = await this.callApi('api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to chat: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }
}

// Create a global instance of the Ollama client
window.ollamaClient = new OllamaClient();

// Initialize the client when the page loads
window.addEventListener('load', async () => {
  try {
    await window.ollamaClient.init();
    console.log('Ollama client initialized');
  } catch (error) {
    console.error('Failed to initialize Ollama client:', error);
  }
}); 