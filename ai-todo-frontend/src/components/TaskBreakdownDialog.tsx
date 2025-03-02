import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Paper,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { Task } from '../types/task';
import SendIcon from '@mui/icons-material/Send';
import ExtractIcon from '@mui/icons-material/CallSplit';
import ExtractTasksDialog from './ExtractTasksDialog';
import config from '../config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TaskBreakdownDialogProps {
  open: boolean;
  task: Task;
  onClose: () => void;
  onAddSubtasks: (subtasks: Partial<Task>[]) => void;
}

export default function TaskBreakdownDialog({ open, task, onClose, onAddSubtasks }: TaskBreakdownDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);

  // Initialize with system message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hi! I'll help you break down the task "${task.title}" into smaller subtasks. How would you like to approach this?`
        }
      ]);
    }
  }, [task.title]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      setLoading(true);
      setError('');  // Clear any previous errors

      // Add user message
      const newMessages = [...messages, { role: 'user', content: inputMessage }];
      setMessages(newMessages);
      setInputMessage('');

      const response = await fetch(`${config.apiUrl}/api/tasks/${task.id}/breakdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_prompt: inputMessage,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to get response');
      }

      // Only add AI's response if we got one
      if (data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }]);
        setError(''); // Clear any errors since we got a valid response
      } else {
        setError('No response received from AI');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractTasks = () => {
    setError(''); // Clear any previous errors
    // Open extract dialog with last AI message
    const lastAiMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAiMessage) {
      setExtractDialogOpen(true);
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { height: '80vh', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle>Task Breakdown Chat</DialogTitle>
        
        <DialogContent sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          p: 2,
          flexGrow: 1,
          overflow: 'hidden'
        }}>
          {/* Messages Container */}
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            mb: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                    borderRadius: 2
                  }}
                >
                  <Typography 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {message.content}
                  </Typography>
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Box sx={{ 
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            pt: 2
          }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={loading}
              multiline
              maxRows={3}
            />
            <IconButton 
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
              color="primary"
            >
              {loading ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>
          </Box>

          {error && (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExtractTasks}
            startIcon={<ExtractIcon />}
            disabled={!messages.some(m => m.role === 'assistant')}
          >
            Extract Tasks
          </Button>
        </DialogActions>
      </Dialog>

      {/* Extract Tasks Dialog */}
      {extractDialogOpen && (
        <ExtractTasksDialog
          open={extractDialogOpen}
          onClose={() => setExtractDialogOpen(false)}
          aiMessage={messages.filter(m => m.role === 'assistant').pop()?.content || ''}
          onAddTasks={onAddSubtasks}
        />
      )}
    </>
  );
}
