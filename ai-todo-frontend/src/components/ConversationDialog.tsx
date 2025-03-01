import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Paper,
  IconButton,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import config from '@/config/config';

interface Message {
  id: number;
  conversation_id: number;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

interface Conversation {
  id: number;
  title: string;
  goal_id: number;
  messages: Message[];
  created_at: string;
  updated_at: string | null;
}

interface ConversationDialogProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  goalContext?: {
    title: string;
    description: string;
  };
}

export default function ConversationDialog({
  open,
  onClose,
  conversation,
  goalContext
}: ConversationDialogProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(conversation.messages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClose = async () => {
    try {
      // Save any unsaved messages
      for (const message of messages) {
        if (!message.id || message.id > 1000000000000) { // If it's a temporary ID
          await fetch(`${config.apiUrl}/api/conversations/${conversation.id}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: message.content,
              role: message.role
            }),
          });
        }
      }
    } catch (err) {
      console.error('Error saving messages:', err);
    }
    onClose();
  };

  const handleUpdateTitle = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/conversations/${conversation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update conversation title');
      }

      setIsEditingTitle(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update title';
      setError(errorMessage);
      console.error('Error:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      content: inputMessage,
      role: 'user' as const
    };

    try {
      setLoading(true);
      setError('');

      // Add user message immediately for better UX
      const tempUserMessage = {
        id: Date.now(), // Temporary ID
        conversation_id: conversation.id,
        content: userMessage.content,
        role: userMessage.role,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Send the message to the backend
      const response = await fetch(`${config.apiUrl}/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Get the updated conversation with all messages
      const conversationResponse = await fetch(`${config.apiUrl}/api/conversations/${conversation.id}`);
      if (!conversationResponse.ok) {
        throw new Error('Failed to fetch conversation');
      }
      const updatedConversation = await conversationResponse.json();
      setMessages(updatedConversation.messages);
      
      setInputMessage('');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => handleClose()}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <div className="flex justify-between items-center">
          {isEditingTitle ? (
            <TextField
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleUpdateTitle}
              onKeyPress={(e) => e.key === 'Enter' && handleUpdateTitle()}
              size="small"
              autoFocus
              fullWidth
              sx={{ mr: 2 }}
            />
          ) : (
            <Typography
              variant="h6"
              onClick={() => setIsEditingTitle(true)}
              sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
            >
              {title}
            </Typography>
          )}
          {goalContext && (
            <Typography variant="body2" color="text.secondary">
              Goal: {goalContext.title}
            </Typography>
          )}
        </div>
      </DialogTitle>

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
              key={message.id}
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
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1, mt: 0.5 }}
              >
                {new Date(message.created_at).toLocaleTimeString()}
              </Typography>
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

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
