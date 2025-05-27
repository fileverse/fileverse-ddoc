import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from '@fileverse/ui';
import LLMSettings from './components/settings/LLMSettings.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LLMSettings>
        <App />
      </LLMSettings>
    </ThemeProvider>
  </React.StrictMode>,
);
