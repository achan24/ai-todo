'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box,
  Paper,
} from '@mui/material';
import config from '@/config/config';

export default function NewGoal() {
  const router = useRouter();
  const [goal, setGoal] = useState({
    title: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${config.apiUrl}/api/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goal),
      });

      if (response.ok) {
        router.push('/'); // Return to goals list
        router.refresh();
      } else {
        console.error('Failed to create goal');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleChange = (field: string) => (event: any) => {
    setGoal({ ...goal, [field]: event.target.value });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Goal
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="What is your goal?"
            value={goal.title}
            onChange={handleChange('title')}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Why is this goal important to you?"
            value={goal.description}
            onChange={handleChange('description')}
            margin="normal"
            multiline
            rows={4}
            required
            placeholder="This will help you stay motivated and focused on what matters"
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              size="large"
            >
              Create Goal
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
