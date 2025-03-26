# Bring Your Own LLM Model Feature

This feature allows users to integrate their local or third-party hosted LLM models with dDocs.

## Overview

The "Bring Your Own Model" feature enables users to connect self-hosted or third-party hosted LLMs with dDocs.
Users can configure their custom models through a user-friendly interface and select them from a dropdown menu.

## Components

### LLMSettings

Main wrapper component that provides context for all model-related operations. Wrap your application or specific parts of your application with this component to enable custom model functionality.

```jsx
import { LLMSettings } from './components/settings';

function App() {
  return (
    <LLMSettings>
      <YourAppContent />
    </LLMSettings>
  );
}
```

### ModelSelector

A dropdown selector that allows users to choose between available models (default and custom).

### ModelSidebar

A sidebar component that appears when the user clicks the settings button. It contains the model settings form.

### ModelSettings

The form component that allows users to add, edit, and delete custom LLM models.

## Data Structure

Custom models have the following properties:

- **LLM Label**: Display name for the model in the UI
- **Model request name**: The exact name required by the serving framework
- **Server endpoint**: URL where the serving framework listens for requests
- **Context size**: Maximum tokens the model can process
- **API Key**: Optional authentication credentials
- **System prompt**: Custom instructions for guiding model responses

## Usage

1. Import the `LLMSettings` component
2. Wrap the part of your application that needs access to LLM features
3. The component will automatically display a model selector in the bottom right corner
4. Users can click the settings button to open the model configuration sidebar

## API

### useCustomModels

A hook that provides access to the custom models functionality:

```jsx
import { useCustomModels } from './components/settings';

function MyComponent() {
  const {
    models, // Array of available custom models
    selectedModelId, // Currently selected model ID
    selectModel, // Function to select a model
    callSelectedModel, // Function to call the selected model with a prompt
    isLoading, // Boolean indicating if a request is in progress
    error, // Error message if the request failed
  } = useCustomModels();

  const handlePrompt = async () => {
    try {
      const response = await callSelectedModel('What is the meaning of life?');
      console.log(response);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <button onClick={handlePrompt} disabled={isLoading}>
        Ask Question
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### ModelService

A utility class that handles API calls to custom LLM models:

- `ModelService.callModel(model, prompt, systemPrompt?)`: Calls a custom model with a prompt
- `ModelService.validateEndpoint(endpoint, apiKey?)`: Validates if an endpoint is accessible

## Storage

Custom models are stored in the browser's localStorage to persist between sessions.

## Integration

To integrate this feature into your application:

1. Add all components from the `/components/settings` directory to your project
2. Import and use the `LLMSettings` component as a wrapper
3. Use the `useCustomModels` hook to interact with custom models programmatically

## Example Model Integration

For example, to integrate with a local Ollama server:

- LLM Label: "Local Llama 3"
- Model request name: "llama3:latest"
- Server endpoint: "http://localhost:11434/api/generate"
- Context size: 4096
- API Key: (leave empty for local servers)
- System prompt: "You are a helpful AI assistant..."
