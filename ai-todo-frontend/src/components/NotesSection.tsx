import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import NoteDialog from './NoteDialog';
import config from '@/config/config';

interface Note {
  id: number;
  content: string;
  pinned: boolean;
  goal_id: number;
  created_at: string;
  updated_at: string;
}

interface NotesSectionProps {
  goalId: number;
}

export default function NotesSection({ goalId }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | ''>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
  const [error, setError] = useState('');

  const pinnedNotes = notes.filter(note => note.pinned).slice(0, 3);
  const selectedNote = selectedNoteId ? notes.find(note => note.id === selectedNoteId) : null;

  useEffect(() => {
    fetchNotes();
  }, [goalId]);

  const fetchNotes = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/notes`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      const data = await response.json();
      setNotes(data);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes');
    }
  };

  const handleAddNote = () => {
    setEditingNote(undefined);
    setIsDialogOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsDialogOpen(true);
  };

  const handleNoteSaved = (note: Note) => {
    fetchNotes();
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/notes/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pinned: !note.pinned
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      fetchNotes();
    } catch (err) {
      console.error('Error updating note:', err);
      setError('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this note?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      if (selectedNoteId === noteId) {
        setSelectedNoteId('');
      }
      
      fetchNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 4 }}>
      <div className="flex justify-between items-center mb-4">
        <Typography variant="h6">Notes</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddNote}
          variant="outlined"
          size="small"
        >
          Add Note
        </Button>
      </div>

      {error && (
        <Typography color="error" className="mb-4">
          {error}
        </Typography>
      )}

      {/* Pinned Notes Section */}
      <div className="mb-4">
        <Typography variant="subtitle2" color="text.secondary" className="mb-2">
          Pinned Notes ({pinnedNotes.length}/3)
        </Typography>
        {pinnedNotes.length === 0 ? (
          <Typography color="text.secondary" variant="body2" className="italic">
            No pinned notes. Pin important notes to see them here.
          </Typography>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {pinnedNotes.map((note) => (
              <div 
                key={note.id}
                className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 relative h-[150px] flex flex-col"
              >
                <div className="flex justify-between mb-1">
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(note.updated_at)}
                  </Typography>
                  <div className="flex gap-1">
                    <Tooltip title="Unpin">
                      <IconButton 
                        size="small" 
                        onClick={() => handleTogglePin(note)}
                      >
                        <PushPinIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditNote(note)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
                <div className="overflow-y-auto flex-grow">
                  <Typography variant="body2" className="whitespace-pre-wrap">
                    {note.content}
                  </Typography>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Selector */}
      <div className="mb-4">
        <FormControl fullWidth size="small">
          <InputLabel>Select Note</InputLabel>
          <Select
            value={selectedNoteId}
            onChange={(e) => setSelectedNoteId(e.target.value as number)}
            label="Select Note"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {notes.map((note) => (
              <MenuItem key={note.id} value={note.id}>
                <div className="flex items-center gap-2">
                  {note.pinned && <PushPinIcon fontSize="small" color="primary" />}
                  <span className="truncate max-w-[200px]">{note.content}</span>
                </div>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {/* Selected Note Display */}
      {selectedNote && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              {selectedNote.pinned && (
                <Chip 
                  icon={<PushPinIcon fontSize="small" />} 
                  label="Pinned" 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              )}
            </div>
            <div className="flex gap-1">
              <Tooltip title={selectedNote.pinned ? "Unpin" : "Pin"}>
                <IconButton 
                  size="small" 
                  onClick={() => handleTogglePin(selectedNote)}
                >
                  {selectedNote.pinned ? 
                    <PushPinIcon fontSize="small" color="primary" /> : 
                    <PushPinOutlinedIcon fontSize="small" />
                  }
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton 
                  size="small" 
                  onClick={() => handleEditNote(selectedNote)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton 
                  size="small" 
                  onClick={() => handleDeleteNote(selectedNote.id)}
                >
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
          <Typography variant="body1" className="whitespace-pre-wrap mb-2">
            {selectedNote.content}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Created: {formatDate(selectedNote.created_at)}
            {selectedNote.updated_at !== selectedNote.created_at && 
              ` • Updated: ${formatDate(selectedNote.updated_at)}`
            }
          </Typography>
        </div>
      )}

      {/* Note Dialog */}
      <NoteDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        note={editingNote}
        goalId={goalId}
        onNoteSaved={handleNoteSaved}
      />
    </Paper>
  );
}
