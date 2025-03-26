/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { CustomModel } from './ModelSettings';

interface ModelContextType {
  models: CustomModel[];
  addModel: (model: CustomModel) => void;
  deleteModel: (id: string) => void;
  getModelById: (id: string) => CustomModel | undefined;
  getModelByName: (name: string) => CustomModel | undefined;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [models, setModels] = useState<CustomModel[]>([]);

  // Load models from localStorage on initial load
  useEffect(() => {
    const savedModels = localStorage.getItem('customLLMModels');
    if (savedModels) {
      try {
        setModels(JSON.parse(savedModels));
      } catch (error) {
        console.error('Failed to parse saved models:', error);
      }
    }
  }, []);

  // Save models to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customLLMModels', JSON.stringify(models));
  }, [models]);

  // Add a new model to the list
  const addModel = (model: CustomModel) => {
    // Create ID if not provided
    if (!model.id) {
      model.id = `model-${Date.now()}`;
    }
    setModels([...models, model]);
  };

  // Remove a model from the list
  const deleteModel = (id: string) => {
    setModels(models.filter((model) => model.id !== id));
  };

  // Get a model by its ID
  const getModelById = (id: string) => {
    return models.find((model) => model.id === id);
  };

  // Get a model by its name
  const getModelByName = (name: string) => {
    return models.find((model) => model.modelName === name);
  };

  return (
    <ModelContext.Provider
      value={{
        models,
        addModel,
        deleteModel,
        getModelById,
        getModelByName,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};

export const useModelContext = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModelContext must be used within a ModelProvider');
  }
  return context;
};
