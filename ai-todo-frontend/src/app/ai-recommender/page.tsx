'use client';

import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Tabs, 
  Tab, 
  TextField, 
  Chip,
  CircularProgress
} from '@mui/material';
import config from '@/config/config';

export default function AIRecommenderPage() {
  // States
  const [recommendedGoals, setRecommendedGoals] = useState<any[]>([]);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendation' | 'chat'>('recommendation');

  // Get goal recommendations on page load
  useEffect(() => {
    getGoalRecommendation();
  }, []);

  // Get goal recommendation
  const getGoalRecommendation = async () => {
    setIsLoadingRecommendation(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/ai-recommender/recommend-goal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get goal recommendation: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setRecommendedGoals(Array.isArray(data) ? data : [data]);
      
      // Add initial assistant message
      if (Array.isArray(data) && data.length > 0) {
        const topGoal = data[0];
        setChatMessages([
          {
            role: 'assistant',
            content: `I recommend focusing on "${topGoal.title}". ${topGoal.reasoning}\n\nNext steps:\n${topGoal.next_steps.map((step: any) => `- ${step.description}`).join('\n')}`
          }
        ]);
      }
    } catch (error) {
      console.error('Error getting goal recommendation:', error);
      setRecommendedGoals([]);
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isSendingMessage) return;
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: chatInput }]);
    
    // Clear input
    const userMessage = chatInput;
    setChatInput('');
    
    // Send message to API
    setIsSendingMessage(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/ai-recommender/chat-with-goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Add assistant response to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response || "Sorry, I couldn't generate a response. Please try again." }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, there was an error processing your message. Please try again." }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle chat input key press
  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  return (
    <Container maxWidth="lg" className="py-8">
      <Typography variant="h4" component="h1" className="mb-6">
        AI Goal Recommender
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, value) => setActiveTab(value)}>
          <Tab label="Recommendations" value="recommendation" />
          <Tab label="Chat with AI" value="chat" />
        </Tabs>
      </Box>
      
      {activeTab === 'recommendation' ? (
        <Box className="mb-6">
          <Box className="flex justify-between items-center mb-4">
            <Typography variant="h5">Top Goals to Focus On</Typography>
            <Button 
              variant="outlined" 
              onClick={getGoalRecommendation}
              disabled={isLoadingRecommendation}
              startIcon={isLoadingRecommendation ? <CircularProgress size={20} /> : null}
            >
              Refresh Recommendations
            </Button>
          </Box>
          
          {isLoadingRecommendation ? (
            <Box className="flex justify-center items-center py-8">
              <CircularProgress />
            </Box>
          ) : recommendedGoals && recommendedGoals.length > 0 ? (
            <Box className="space-y-4">
              {recommendedGoals.slice(0, 3).map((goal, index) => (
                <Box 
                  key={index} 
                  className={`bg-${index === 0 ? 'blue' : index === 1 ? 'purple' : 'indigo'}-50 p-4 rounded-lg border border-${index === 0 ? 'blue' : index === 1 ? 'purple' : 'indigo'}-100`}
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: index === 0 ? '#ebf5ff' : index === 1 ? '#f5f3ff' : '#eef2ff',
                    borderColor: index === 0 ? '#bfdbfe' : index === 1 ? '#ddd6fe' : '#c7d2fe',
                  }}
                  onClick={() => {
                    window.location.href = `/goals/${goal.id}`;
                  }}
                >
                  <Box className="flex items-center justify-between mb-2">
                    <Box className="flex items-center gap-2">
                      <Box 
                        className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold"
                        sx={{ 
                          bgcolor: index === 0 ? '#3b82f6' : index === 1 ? '#8b5cf6' : '#6366f1',
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Typography variant="h6">{goal.title}</Typography>
                    </Box>
                    <Box className="flex items-center gap-2">
                      <Chip 
                        label={goal.priority || 'No priority'} 
                        color={goal.priority === 'high' ? 'error' : goal.priority === 'medium' ? 'warning' : 'default'}
                        size="small"
                      />
                      <Typography variant="body2" className="text-gray-600">
                        Confidence: {(goal.ai_confidence * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1" className="mb-3">{goal.reasoning}</Typography>
                  
                  <Typography variant="subtitle2" className="mb-1 font-bold">Next Steps:</Typography>
                  <ul className="list-disc pl-5">
                    {goal.next_steps.slice(0, 2).map((step: any, stepIndex: number) => (
                      <li key={stepIndex} className="text-sm mb-1">
                        {step.description}
                      </li>
                    ))}
                  </ul>
                  
                  <Box className="mt-3 flex justify-end">
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color={index === 0 ? 'primary' : index === 1 ? 'secondary' : 'info'}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/goals/${goal.id}`;
                      }}
                    >
                      View Goal
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography>No recommendations available. Please try again.</Typography>
          )}
        </Box>
      ) : (
        <Box className="mb-6">
          <Box className="bg-gray-50 p-4 rounded-lg mb-4 h-96 overflow-y-auto">
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => (
                <Box key={index} className={`mb-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <Box 
                    className={`inline-block p-3 rounded-lg max-w-[80%]`}
                    sx={{ 
                      bgcolor: msg.role === 'user' ? '#dbeafe' : '#ffffff',
                      border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb',
                    }}
                  >
                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.content || "Sorry, I couldn't generate a response. Please try again."}
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Box className="h-full flex items-center justify-center">
                <Typography variant="body2" className="text-gray-500">
                  Start a conversation about your goals. Ask for advice, prioritization help, or strategies to achieve your goals.
                </Typography>
              </Box>
            )}
          </Box>
          <Box className="flex flex-col gap-2">
            <TextField
              fullWidth
              placeholder="Ask about your goals..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              disabled={isSendingMessage}
              multiline
              maxRows={3}
              variant="outlined"
            />
            <Box className="flex justify-between items-center">
              <Typography variant="caption" className="text-gray-500">
                Tip: Press Enter to send
              </Typography>
              <Button 
                variant="contained" 
                onClick={sendChatMessage}
                disabled={isSendingMessage || !chatInput.trim()}
                color="primary"
              >
                {isSendingMessage ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  'Send'
                )}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Container>
  );
}
