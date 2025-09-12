/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, ReactNode, useMemo } from 'react';

// Define the type for the context
type EditingContextType = {
  isPreviewMode: boolean;
  isPresentationMode?: boolean;
  isCollaboratorsDoc?: boolean;
};

// Create a Context
const EditingContext = createContext<EditingContextType>({
  isPreviewMode: false,
  isPresentationMode: false,
  isCollaboratorsDoc: false,
});

// Create a Hook to use this Context
export const useEditingContext = () => {
  const context = useContext(EditingContext);
  if (!context) {
    throw new Error('useEditingContext must be used within an EditingProvider');
  }
  return context;
};

// Define the type for the provider props
type EditingProviderProps = {
  children: ReactNode;
  isPreviewMode: boolean;
  isPresentationMode?: boolean;
  isCollaboratorsDoc?: boolean;
};

// Create a Provider Component
export const EditingProvider: React.FC<EditingProviderProps> = ({
  children,
  isPreviewMode,
  isPresentationMode,
  isCollaboratorsDoc,
}) => {
  const value = useMemo(
    () => ({ isPreviewMode, isPresentationMode, isCollaboratorsDoc }),
    [isPreviewMode, isPresentationMode, isCollaboratorsDoc],
  );
  return (
    <EditingContext.Provider value={value}>{children}</EditingContext.Provider>
  );
};
