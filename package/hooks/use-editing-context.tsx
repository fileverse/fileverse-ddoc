import React, { createContext, useContext, ReactNode } from 'react';

// Define the type for the context
type EditingContextType = boolean | null;

// Create a Context
const EditingContext = createContext<EditingContextType>(null);

// Create a Hook to use this Context
export const useEditingContext = () => useContext(EditingContext);

// Define the type for the provider props
type EditingProviderProps = {
  children: ReactNode;
  isPreviewMode: boolean;
};

// Create a Provider Component
export const EditingProvider: React.FC<EditingProviderProps> = ({
  children,
  isPreviewMode,
}) => {
  return (
    <EditingContext.Provider value={isPreviewMode}>
      {children}
    </EditingContext.Provider>
  );
};
