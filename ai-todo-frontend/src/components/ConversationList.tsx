import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Typography,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import AddIcon from '@mui/icons-material/Add';
import ConversationDialog from './ConversationDialog';
import config from '@/config/config';

interface Message {
  id: number;
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

interface ConversationListProps {
  goalId: number;
  goalTitle: string;
  goalDescription: string;
  conversations: Conversation[];
  onConversationAdded: (conversation: Conversation) => void;
  onConversationDeleted: (conversationId: number) => void;
}

export default function ConversationList({
  goalId,
  goalTitle,
  goalDescription,
  conversations,
  onConversationAdded,
  onConversationDeleted
}: ConversationListProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState('');

  const handleStartNewConversation = async () => {
    try {
      const defaultTitle = `Chat ${new Date().toLocaleString()}`;
      const response = await fetch(`${config.apiUrl}/api/goals/${goalId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: defaultTitle,
          goal_id: goalId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const newConversation = await response.json();
      onConversationAdded(newConversation);
      setSelectedConversation(newConversation);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      console.error('Error:', err);
    }
  };

  const handleCloseConversation = () => {
    // Refresh the conversation list to get the latest messages
    fetch(`${config.apiUrl}/api/goals/${goalId}/conversations`)
      .then(response => response.json())
      .then(data => {
        // Find the updated conversation in the list
        const updatedConversation = data.find((conv: Conversation) => conv.id === selectedConversation?.id);
        if (updatedConversation) {
          // Just update the single conversation
          onConversationAdded(updatedConversation);
        }
      })
      .catch(err => console.error('Error refreshing conversations:', err));
    
    setSelectedConversation(null);
  };

  const handleDeleteConversation = async (conversationId: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this conversation?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${config.apiUrl}/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      onConversationDeleted(conversationId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMessage);
      console.error('Error:', err);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <div className="flex justify-between items-center mb-4">
        <Typography variant="h6">Conversations</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleStartNewConversation}
          variant="outlined"
          size="small"
        >
          New Chat
        </Button>
      </div>

      {error && (
        <Typography color="error" className="mb-4">
          {error}
        </Typography>
      )}

      {conversations.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          No conversations yet. Start one to discuss your goal!
        </Typography>
      ) : (
        <List>
          {conversations.map((conversation) => (
            <ListItem
              key={`conversation-${conversation.id}`}
              onClick={() => setSelectedConversation(conversation)}
              sx={{
                mb: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer'
              }}
            >
              <ChatIcon sx={{ mr: 2, color: 'primary.main' }} />
              <ListItemText
                primary={conversation.title}
                secondary={`${conversation.messages.length} messages • Last updated: ${
                  conversation.updated_at
                    ? new Date(conversation.updated_at).toLocaleString()
                    : new Date(conversation.created_at).toLocaleString()
                }`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Conversation Dialog */}
      {selectedConversation && (
        <ConversationDialog
          open={!!selectedConversation}
          onClose={() => handleCloseConversation()}
          conversation={selectedConversation}
          goalContext={{
            title: goalTitle,
            description: goalDescription
          }}
        />
      )}
    </Paper>
  );
}
