import { useState } from 'react';
import {
  TextField,
  Button,
  TextAreaField,
  Card,
  DynamicModal,
  Label,
} from '@fileverse/ui';
import { useModelContext } from './ModelContext';

export interface CustomModel {
  id?: string;
  label: string;
  modelName: string;
  endpoint: string;
  contextSize: number;
  apiKey: string;
  systemPrompt: string;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

// Custom NumberField component since it doesn't exist in the UI library
const NumberField = ({ label, value, onChange, min, max }: NumberFieldProps) => {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-body-sm">{label}</Label>
      <TextField
        type="number"
        className="border rounded-md px-3 py-2 w-full"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
      />
    </div>
  );
};

// Helper component to display helper text with form fields
const HelperText = ({ text }: { text: string }) => (
  <div className="text-xs color-text-secondary mt-1">{text}</div>
);

const ModelSettings = () => {
  const { defaultModels } = useModelContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModel, setNewModel] = useState<CustomModel>({
    label: '',
    modelName: '',
    endpoint: '',
    contextSize: 4000,
    apiKey: '',
    systemPrompt:
      'You are a helpful AI assistant. Please provide accurate and concise responses and not include any preambles in your responses.',
  });
  const [error, setError] = useState<string | null>(null);

  const handleAddModel = () => {
    // Validate input
    if (!newModel.label || !newModel.modelName || !newModel.endpoint) {
      setError('Please fill all required fields');
      return;
    }

    // Add model to the list with a generated ID
    // addModel(newModel);

    // Reset form and close modal
    setNewModel({
      label: '',
      modelName: '',
      endpoint: '',
      contextSize: 4000,
      apiKey: '',
      systemPrompt:
        'You are a helpful AI assistant. Please provide accurate and concise responses and not include any preambles in your responses.',
    });
    setShowAddModal(false);
    setError(null);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4 gap-2">
        <h2 className="text-heading-sm font-semibold">Custom LLM Models</h2>
        <Button
          onClick={() => setShowAddModal(true)}
          size="sm"
          variant="default"
        >
          Add Model
        </Button>
      </div>

      {/* List of added models */}
      <div className="space-y-4">
        {defaultModels.length === 0 ? (
          <div className="text-center p-2 border rounded-md color-border-default">
            <p className="text-body-sm color-text-secondary">No custom models added yet</p>
          </div>
        ) : (
          defaultModels.map((model) => (
            <Card key={model.id} className="p-4 color-bg-muted">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{model.label}</h3>
                  <p className="text-body-sm color-text-secondary">
                    {model.modelName}
                  </p>
                  <p className="text-body-sm color-text-secondary truncate max-w-md">
                    {model.endpoint}
                  </p>
                </div>
                {/* <Tooltip text="Delete model">
                  <IconButton
                    icon="Trash2"
                    variant="ghost"
                    size="sm"
                    // onClick={() => deleteModel(model.id || '')}
                  />
                </Tooltip> */}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Model Modal */}
      <DynamicModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="Add Custom LLM Model"
        hasCloseIcon
        content={
          <>
            {error && (
              <div className="mb-4 p-2 color-bg-danger-light color-text-danger rounded">
                {error}
              </div>
            )}

            <form className="space-y-4">
              <div>
                <TextField
                  label="LLM Label"
                  placeholder="e.g., My Custom GPT"
                  value={newModel.label}
                  onChange={(e) =>
                    setNewModel({ ...newModel, label: e.target.value })
                  }
                  required
                />
                <HelperText text="How should the model be named on the model selection screen" />
              </div>

              <div>
                <TextField
                  label="Model request name"
                  placeholder="e.g., llama-3.2"
                  value={newModel.modelName}
                  onChange={(e) =>
                    setNewModel({ ...newModel, modelName: e.target.value })
                  }
                  required
                />
                <HelperText text="Must match exactly what is expected by the serving framework" />
              </div>

              <div>
                <TextField
                  label="Server endpoint"
                  placeholder="e.g., http://localhost:11434/api/generate"
                  value={newModel.endpoint}
                  onChange={(e) =>
                    setNewModel({ ...newModel, endpoint: e.target.value })
                  }
                  required
                />
                <HelperText text="The URL where your serving framework is listening for requests" />
              </div>

              <div>
                <NumberField
                  label="Context size"
                  value={newModel.contextSize}
                  onChange={(value) =>
                    setNewModel({ ...newModel, contextSize: value })
                  }
                  min={1}
                />
                <HelperText text="Maximum number of tokens the model can process (approx. 3/4 of a word per token)" />
              </div>

              <div>
                <TextField
                  label="API Key"
                  placeholder="Enter API key if required"
                  value={newModel.apiKey}
                  onChange={(e) =>
                    setNewModel({ ...newModel, apiKey: e.target.value })
                  }
                  type="password"
                />
                <HelperText text="Authentication credentials (optional)" />
              </div>

              <div>
                <TextAreaField
                  label="System prompt"
                  placeholder="Custom instructions for the model"
                  value={newModel.systemPrompt}
                  onChange={(e) =>
                    setNewModel({ ...newModel, systemPrompt: e.target.value })
                  }
                  rows={5}
                />
                <HelperText text="Give custom instructions to guide the model's responses" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="default" onClick={handleAddModel}>
                  Add Model
                </Button>
              </div>
            </form>
          </>
        }
      />
    </div>
  );
};

export default ModelSettings;
