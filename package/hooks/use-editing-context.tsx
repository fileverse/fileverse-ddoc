/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, ReactNode } from 'react';

// Define the type for the context
type EditingContextType = {
  isPreviewMode: boolean;
  isPresentationMode?: boolean;
};

// Create a Context
const EditingContext = createContext<EditingContextType>({
  isPreviewMode: false,
  isPresentationMode: false,
});

// Create a Hook to use this Context
export const useEditingContext = () => useContext(EditingContext);

// Define the type for the provider props
type EditingProviderProps = {
  children: ReactNode;
  isPreviewMode: boolean;
  isPresentationMode?: boolean;
};

// Create a Provider Component
export const EditingProvider: React.FC<EditingProviderProps> = ({
  children,
  isPreviewMode,
  isPresentationMode,
}) => {
  return (
    <EditingContext.Provider value={{ isPreviewMode, isPresentationMode }}>
      {children}
    </EditingContext.Provider>
  );
};
