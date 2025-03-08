import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Box,
  Divider,
} from '@mui/material';
// Date picker components removed due to compatibility issues
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import config from '@/config/config';

interface Phase {
  id?: number;
  phase_name: string;
  approach_used?: string;
  effectiveness_score?: number;
  response_outcome?: string;
  notes?: string;
  situation_id?: number;
}

interface Situation {
  id?: number;
  title: string;
  description?: string;
  situation_type: 'planned' | 'completed';
  start_time?: string | null;
  end_time?: string | null;
  outcome?: 'success' | 'partial_success' | 'failure' | null;
  score?: number | null;
  lessons_learned?: string;
  goal_id: number;
  phases: Phase[];
}

interface SituationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (situation: Situation) => void;
  situation?: Situation;
  goalId: number;
}

const defaultPhase: Phase = {
  phase_name: '',
  approach_used: '',
  effectiveness_score: undefined,
  response_outcome: '',
  notes: '',
};

const defaultSituation: Situation = {
  title: '',
  description: '',
  situation_type: 'planned',
  start_time: '',
  end_time: '',
  outcome: '',
  score: undefined,
  lessons_learned: '',
  goal_id: 0,
  phases: [{ ...defaultPhase }],
};

const SituationDialog: React.FC<SituationDialogProps> = ({
  open,
  onClose,
  onSave,
  situation,
  goalId,
}) => {
  const [formData, setFormData] = useState<Situation>(defaultSituation);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (situation) {
      // Format the situation data to avoid null values in form inputs
      const formattedSituation = {
        ...situation,
        // Convert null values to empty strings for form inputs
        start_time: situation.start_time || '',
        end_time: situation.end_time || '',
        outcome: situation.outcome || '',
        score: situation.score === null ? undefined : situation.score,
        description: situation.description || '',
        lessons_learned: situation.lessons_learned || '',
        // Ensure we have at least one phase
        phases: situation.phases.length > 0 ? 
          situation.phases.map(phase => ({
            ...phase,
            approach_used: phase.approach_used || '',
            response_outcome: phase.response_outcome || '',
            notes: phase.notes || '',
          })) : 
          [{ ...defaultPhase }],
      };
      setFormData(formattedSituation);
    } else {
      setFormData({
        ...defaultSituation,
        goal_id: goalId,
      });
    }
    setErrors({});
  }, [situation, goalId, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? null : parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      [name]: numValue,
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || null,
    }));
  };

  const handlePhaseChange = (index: number, field: keyof Phase, value: any) => {
    console.log(`Updating phase ${index}, field ${field}:`, value);
    setFormData((prev) => {
      const updatedPhases = [...prev.phases];
      
      // Special handling for effectiveness_score to ensure consistent value types
      if (field === 'effectiveness_score') {
        // For empty string, store as empty string in the form state (not undefined or null)
        // This ensures the input remains controlled
        updatedPhases[index] = {
          ...updatedPhases[index],
          [field]: value,
        };
      } else {
        // For other fields, just set the value directly
        updatedPhases[index] = {
          ...updatedPhases[index],
          [field]: value,
        };
      }
      
      return {
        ...prev,
        phases: updatedPhases,
      };
    });
  };

  const addPhase = () => {
    setFormData((prev) => ({
      ...prev,
      phases: [...prev.phases, { ...defaultPhase }],
    }));
  };

  const removePhase = (index: number) => {
    if (formData.phases.length <= 1) return;
    
    setFormData((prev) => {
      const updatedPhases = [...prev.phases];
      updatedPhases.splice(index, 1);
      return {
        ...prev,
        phases: updatedPhases,
      };
    });
  };

  const validateForm = () => {
    console.log('Validating form data:', formData);
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
      console.log('Validation error: Title is required');
    }
    
    // Validate each phase has a name
    formData.phases.forEach((phase, index) => {
      if (!phase.phase_name.trim()) {
        newErrors[`phase_${index}`] = 'Phase name is required';
        console.log(`Validation error: Phase ${index} name is required`);
      }
    });
    
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('Form validation result:', isValid ? 'Valid' : 'Invalid', newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    console.log('Submit button clicked');
    if (validateForm()) {
      // Create a copy of the form data for submission
      const submissionData = {
        ...formData,
        // Format dates to ISO strings for backend compatibility
        start_time: formData.start_time && formData.start_time.trim() !== '' ? formData.start_time : null,
        end_time: formData.end_time && formData.end_time.trim() !== '' ? formData.end_time : null,
        // Handle empty outcome
        outcome: formData.outcome && formData.outcome.trim() !== '' ? formData.outcome : null,
        // Ensure score is a number or null
        score: formData.score === undefined || formData.score === '' ? null : 
          typeof formData.score === 'string' ? parseInt(formData.score, 10) : formData.score,
        // Ensure phases are properly formatted
        phases: formData.phases.map(phase => ({
          ...phase,
          // Convert empty strings to null for optional fields
          approach_used: phase.approach_used && phase.approach_used.trim() !== '' ? phase.approach_used : null,
          response_outcome: phase.response_outcome && phase.response_outcome.trim() !== '' ? phase.response_outcome : null,
          notes: phase.notes && phase.notes.trim() !== '' ? phase.notes : null,
          // Ensure effectiveness_score is a number or null
          effectiveness_score: phase.effectiveness_score === undefined || phase.effectiveness_score === '' || phase.effectiveness_score === null ? null : 
            typeof phase.effectiveness_score === 'string' ? 
              parseInt(phase.effectiveness_score, 10) : phase.effectiveness_score
        }))
      };
      
      console.log('Form validated successfully, calling onSave with:', submissionData);
      onSave(submissionData);
    } else {
      console.log('Form validation failed');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {situation?.id ? 'Edit Situation' : 'Add New Situation'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            name="title"
            label="Title"
            value={formData.title}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            error={!!errors.title}
            helperText={errors.title}
            required
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Situation Type</InputLabel>
            <Select
              name="situation_type"
              value={formData.situation_type}
              onChange={handleSelectChange}
              label="Situation Type"
            >
              <MenuItem value="planned">Planned (Pre-Action)</MenuItem>
              <MenuItem value="completed">Completed (Post-Action)</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            name="description"
            label="Description"
            value={formData.description || ''}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            multiline
            rows={3}
            placeholder="Describe the situation..."
          />
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              name="start_time"
              label="Start Time"
              type="datetime-local"
              value={formData.start_time || ''}
              onChange={handleDateChange}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              name="end_time"
              label="End Time"
              type="datetime-local"
              value={formData.end_time || ''}
              onChange={handleDateChange}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          
          {formData.situation_type === 'completed' && (
            <>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Outcome</InputLabel>
                  <Select
                    name="outcome"
                    value={formData.outcome || ''}
                    onChange={handleSelectChange}
                    label="Outcome"
                  >
                    <MenuItem value="success">Success</MenuItem>
                    <MenuItem value="partial_success">Partial Success</MenuItem>
                    <MenuItem value="failure">Failure</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  name="score"
                  label="Self-Rating (1-10)"
                  type="number"
                  value={formData.score === null ? '' : formData.score}
                  onChange={handleNumberChange}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 1, max: 10 }}
                />
              </Box>
              
              <TextField
                name="lessons_learned"
                label="Key Lessons Learned"
                value={formData.lessons_learned || ''}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={3}
                placeholder="What worked, what didn't, and future improvements..."
              />
            </>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Phases</Typography>
            <Button 
              startIcon={<AddIcon />} 
              onClick={addPhase}
              variant="outlined"
              size="small"
            >
              Add Phase
            </Button>
          </Box>
          
          {formData.phases.map((phase, index) => (
            <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">Phase {index + 1}</Typography>
                <IconButton 
                  size="small" 
                  onClick={() => removePhase(index)}
                  disabled={formData.phases.length <= 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              
              <TextField
                label="Phase Name"
                value={phase.phase_name}
                onChange={(e) => handlePhaseChange(index, 'phase_name', e.target.value)}
                fullWidth
                margin="normal"
                error={!!errors[`phase_${index}`]}
                helperText={errors[`phase_${index}`]}
                required
                placeholder="e.g., Opening, Execution, Reflection"
              />
              
              <TextField
                label="Approach Used"
                value={phase.approach_used || ''}
                onChange={(e) => handlePhaseChange(index, 'approach_used', e.target.value)}
                fullWidth
                margin="normal"
                placeholder="The method or strategy applied in this phase"
              />
              
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  label="Effectiveness Score (1-10)"
                  type="number"
                  value={phase.effectiveness_score === undefined || phase.effectiveness_score === null ? '' : phase.effectiveness_score}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Always use empty string or number, never undefined
                    const parsedValue = value === '' ? '' : parseInt(value, 10);
                    handlePhaseChange(index, 'effectiveness_score', parsedValue);
                  }}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 1, max: 10 }}
                />
                
                <TextField
                  label="Response/Outcome"
                  value={phase.response_outcome || ''}
                  onChange={(e) => handlePhaseChange(index, 'response_outcome', e.target.value)}
                  fullWidth
                  margin="normal"
                  placeholder="What happened as a result of this phase?"
                />
              </Box>
              
              <TextField
                label="Notes & Observations"
                value={phase.notes || ''}
                onChange={(e) => handlePhaseChange(index, 'notes', e.target.value)}
                fullWidth
                margin="normal"
                multiline
                rows={2}
                placeholder="Insights into what worked or failed"
              />
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          console.log('Cancel button clicked');
          onClose();
        }}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          data-testid="save-situation-button"
        >
          {situation?.id ? 'Update' : 'Create'} Situation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SituationDialog;
