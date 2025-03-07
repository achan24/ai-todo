import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import config from '@/config/config';

interface Note {
  id: number;
  content: string;
  pinned: boolean;
  goal_id: number;
  created_at: string;
  updated_at: string;
}

interface NoteDialogProps {
  open: boolean;
  onClose: () => void;
  note?: Note;
  goalId: number;
  onNoteSaved: (note: Note) => void;
}

export default function NoteDialog({
  open,
  onClose,
  note,
  goalId,
  onNoteSaved
}: NoteDialogProps) {
  const [content, setContent] = useState(note?.content || '');
  const [pinned, setPinned] = useState(note?.pinned || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Note content cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let response;
      
      if (note) {
        // Update existing note
        response = await fetch(`${config.apiUrl}/api/notes/${note.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            pinned
          }),
        });
      } else {
        // Create new note
        response = await fetch(`${config.apiUrl}/api/goals/${goalId}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            pinned,
            goal_id: goalId
          }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      const savedNote = await response.json();
      onNoteSaved(savedNote);
      handleClose();
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent(note?.content || '');
    setPinned(note?.pinned || false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{note ? 'Edit Note' : 'Add Note'}</DialogTitle>
      <DialogContent>
        {error && (
          <p className="text-red-500 mb-4">{error}</p>
        )}
        <TextField
          autoFocus
          margin="dense"
          label="Note Content"
          fullWidth
          multiline
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          variant="outlined"
          className="mb-4"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              color="primary"
            />
          }
          label="Pin this note"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
