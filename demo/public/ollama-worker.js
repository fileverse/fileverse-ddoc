// Ollama Service Worker
// This service worker proxies requests to the local Ollama instance,
// bypassing CORS and HTTPS restrictions in Safari

let OLLAMA_ENDPOINT = 'http://localhost:11434';
const CACHE_NAME = 'ollama-cache-v1';

// Install event - cache key resources
self.addEventListener('install', () => {
  console.log('Ollama Service Worker installing...');
  self.skipWaiting(); // Force activation on all clients
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Ollama Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
          return Promise.resolve();
        })
      );
    })
  );
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle fetch requests to Ollama
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle requests to the Ollama API
  if (url.pathname.startsWith('/ollama-api/')) {
    event.respondWith(handleOllamaRequest(event.request));
  }
});

// Function to handle Ollama API requests
async function handleOllamaRequest(request) {
  try {
    // Clone the request
    const originalRequest = request.clone();
    
    // Extract the Ollama path from the request URL
    const url = new URL(request.url);
    const ollamaPath = url.pathname.replace('/ollama-api', '');
    
    // Build the Ollama API URL
    const ollamaUrl = `${OLLAMA_ENDPOINT}${ollamaPath}${url.search}`;
    
    // Create a new request to the Ollama API
    const ollamaRequest = new Request(ollamaUrl, {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await originalRequest.blob() : undefined,
      mode: 'cors',
      credentials: 'omit'
    });
    
    // Fetch from the Ollama API
    const response = await fetch(ollamaRequest);
    
    // Return the response
    return response;
  } catch (error) {
    console.error('Error in Ollama Service Worker:', error);
    
    // Return an error response
    return new Response(JSON.stringify({
      error: 'Failed to connect to Ollama API',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Listen for messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PING') {
    // Respond to ping
    event.ports[0].postMessage({
      type: 'PONG',
      message: 'Ollama Service Worker is active'
    });
  }
  
  if (event.data && event.data.type === 'SET_ENDPOINT') {
    // Update the Ollama endpoint
    if (event.data.endpoint) {
      OLLAMA_ENDPOINT = event.data.endpoint;
      console.log('Ollama endpoint updated:', OLLAMA_ENDPOINT);
    }
  }
}); 