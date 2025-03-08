import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Card,
  CardContent,
  CardActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import AssessmentIcon from '@mui/icons-material/Assessment';
// Simple date formatting function instead of using date-fns
import SituationDialog from './SituationDialog';
import config from '@/config/config';

interface Phase {
  id: number;
  phase_name: string;
  approach_used?: string;
  effectiveness_score?: number;
  response_outcome?: string;
  notes?: string;
  situation_id: number;
  created_at: string;
  updated_at: string;
}

interface Situation {
  id: number;
  title: string;
  description?: string;
  situation_type: 'planned' | 'completed';
  start_time?: string;
  end_time?: string;
  outcome?: 'success' | 'partial_success' | 'failure';
  score?: number;
  lessons_learned?: string;
  goal_id: number;
  created_at: string;
  updated_at: string;
  phases: Phase[];
}

interface SituationsSectionProps {
  goalId: number | string;
}

const SituationsSection: React.FC<SituationsSectionProps> = ({ goalId }) => {
  const [situations, setSituations] = useState<Situation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState<Situation | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [situationToDelete, setSituationToDelete] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'planned' | 'completed'>('all');

  useEffect(() => {
    fetchSituations();
  }, [goalId]);

  const fetchSituations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/situations`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch situations: ${response.status}`);
      }
      
      const data = await response.json();
      setSituations(data);
    } catch (err) {
      console.error('Error fetching situations:', err);
      setError('Failed to load situations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSituation = () => {
    console.log('Add Situation button clicked');
    setSelectedSituation(undefined);
    setDialogOpen(true);
    console.log('Dialog open state set to:', true);
  };

  const handleEditSituation = (situation: Situation) => {
    console.log('Editing situation:', situation);
    // Make a deep copy of the situation to avoid reference issues
    const situationCopy = JSON.parse(JSON.stringify(situation));
    setSelectedSituation(situationCopy);
    setDialogOpen(true);
  };

  const handleDeleteClick = (situationId: number) => {
    setSituationToDelete(situationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (situationToDelete === null) return;
    
    try {
      const response = await fetch(`${config.apiUrl}/api/situations/${situationToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete situation: ${response.status}`);
      }
      
      setSituations(situations.filter(s => s.id !== situationToDelete));
      setDeleteDialogOpen(false);
      setSituationToDelete(null);
    } catch (err) {
      console.error('Error deleting situation:', err);
      setError('Failed to delete situation');
    }
  };

  const handleSaveSituation = async (situationData: any) => {
    console.log('Saving situation data:', situationData);
    try {
      // Format the data for the API
      const formattedData = {
        ...situationData,
        // Ensure goal_id is a number
        goal_id: Number(goalId),
        // Format phases to match backend expectations
        phases: situationData.phases.map((phase: any) => ({
          phase_name: phase.phase_name,
          approach_used: phase.approach_used || null,
          effectiveness_score: phase.effectiveness_score || null,
          response_outcome: phase.response_outcome || null,
          notes: phase.notes || null,
          situation_id: phase.situation_id || null
        }))
      };
      
      console.log('Formatted data for API:', formattedData);
      
      let response;
      const apiUrl = config.apiUrl;
      console.log('Using API URL:', apiUrl);
      
      if (situationData.id) {
        // Update existing situation
        console.log('Updating existing situation');
        response = await fetch(`${apiUrl}/api/situations/${situationData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        });
      } else {
        // Create new situation
        console.log('Creating new situation for goal:', goalId);
        response = await fetch(`${apiUrl}/api/goals/${goalId}/situations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        });
      }
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        // Get detailed error information
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Parsed error details:', errorJson);
          throw new Error(`Failed to save situation: ${errorJson.detail || response.statusText}`);
        } catch (parseError) {
          throw new Error(`Failed to save situation: ${response.status} - ${errorText || response.statusText}`);
        }
      }
      
      const savedSituation = await response.json();
      console.log('Successfully saved situation:', savedSituation);
      
      if (situationData.id) {
        // Update in state
        setSituations(situations.map(s => 
          s.id === savedSituation.id ? savedSituation : s
        ));
      } else {
        // Add to state
        setSituations([...situations, savedSituation]);
      }
      
      setDialogOpen(false);
    } catch (err) {
      console.error('Error saving situation:', err);
      setError(`Failed to save situation: ${err.message}`);
      // Keep dialog open so user can try again
      // setDialogOpen(false);
    }
  };

  const handleTypeFilterChange = (event: SelectChangeEvent<'all' | 'planned' | 'completed'>) => {
    setTypeFilter(event.target.value as 'all' | 'planned' | 'completed');
  };

  const filteredSituations = situations.filter(situation => 
    typeFilter === 'all' || situation.situation_type === typeFilter
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString;
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'success': return 'success';
      case 'partial_success': return 'warning';
      case 'failure': return 'error';
      default: return 'default';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'default';
    if (score >= 8) return 'success';
    if (score >= 5) return 'warning';
    return 'error';
  };

  if (loading) {
    return <Typography>Loading situations...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Situations</Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={typeFilter}
              label="Filter by Type"
              onChange={handleTypeFilterChange}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="planned">Planned</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSituation}
            size="small"
          >
            Add Situation
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      {filteredSituations.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No situations found. Create your first situation to track experiences and growth.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredSituations.map((situation) => (
            <Grid item xs={12} md={6} key={situation.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  backgroundColor: situation.situation_type === 'planned' ? '#f0f7ff' : '#fff8e1'
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" gutterBottom>
                      {situation.title}
                    </Typography>
                    <Chip 
                      label={situation.situation_type === 'planned' ? 'Planned' : 'Completed'} 
                      size="small"
                      color={situation.situation_type === 'planned' ? 'info' : 'success'}
                      variant="outlined"
                    />
                  </Box>
                  
                  {situation.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {situation.description}
                    </Typography>
                  )}
                  
                  <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
                    {situation.start_time && (
                      <Chip 
                        icon={<EventIcon fontSize="small" />}
                        label={`Start: ${formatDate(situation.start_time)}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {situation.end_time && (
                      <Chip 
                        icon={<EventIcon fontSize="small" />}
                        label={`End: ${formatDate(situation.end_time)}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  {situation.situation_type === 'completed' && (
                    <Box mt={2}>
                      <Box display="flex" gap={1} mb={1}>
                        {situation.outcome && (
                          <Chip 
                            label={`Outcome: ${situation.outcome.replace('_', ' ')}`}
                            size="small"
                            color={getOutcomeColor(situation.outcome)}
                          />
                        )}
                        {situation.score && (
                          <Chip 
                            icon={<AssessmentIcon fontSize="small" />}
                            label={`Score: ${situation.score}/10`}
                            size="small"
                            color={getScoreColor(situation.score)}
                          />
                        )}
                      </Box>
                      
                      {situation.lessons_learned && (
                        <>
                          <Typography variant="subtitle2" mt={1}>
                            Key Lessons:
                          </Typography>
                          <Typography variant="body2">
                            {situation.lessons_learned}
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
                  
                  {situation.phases.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Phases ({situation.phases.length}):
                      </Typography>
                      {situation.phases.slice(0, 2).map((phase) => (
                        <Box key={phase.id} mb={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {phase.phase_name}
                            {phase.effectiveness_score && ` (${phase.effectiveness_score}/10)`}
                          </Typography>
                          {phase.approach_used && (
                            <Typography variant="body2" color="text.secondary">
                              Approach: {phase.approach_used}
                            </Typography>
                          )}
                        </Box>
                      ))}
                      {situation.phases.length > 2 && (
                        <Typography variant="body2" color="text.secondary">
                          ...and {situation.phases.length - 2} more phases
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Box display="flex" justifyContent="space-between" width="100%">
                    <Typography variant="caption" color="text.secondary">
                      Created: {formatDate(situation.created_at)}
                    </Typography>
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditSituation(situation)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteClick(situation.id)}>
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <SituationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveSituation}
        situation={selectedSituation}
        goalId={Number(goalId)}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Situation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this situation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SituationsSection;
