import React, { useState } from 'react';
import { ModelProvider } from './ModelContext';
import ModelSidebar from './ModelSidebar';
import ModelSelector from './ModelSelector';

interface LLMSettingsProps {
  children?: React.ReactNode;
}

/**
 * Main component that provides LLM model settings capabilities
 * Use this component to wrap areas of your application that need
 * access to custom LLM models
 */
export const LLMSettings: React.FC<LLMSettingsProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <ModelProvider>
      {/* Main content */}
      <div className="relative">
        {children}

        {/* Model selector will typically appear in the UI */}
        <div className="absolute bottom-4 right-4">
          <ModelSelector onSettingsClick={handleOpenSidebar} />
        </div>
      </div>

      {/* Settings sidebar */}
      <ModelSidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
    </ModelProvider>
  );
};

export default LLMSettings;
