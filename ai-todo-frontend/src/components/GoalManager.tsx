'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Container, Typography, Box, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';

interface Goal {
  id: string;
  title: string;
  description: string;
  importance: string;
  deadline: string;
  progress: number;
}

export default function GoalManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch('http://localhost:8005/api/goals');
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleCreateGoal = () => {
    router.push('/goals/new');
  };

  const handleGoalClick = (goalId: string) => {
    router.push(`/goals/${goalId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          My Goals
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateGoal}
        >
          Create New Goal
        </Button>
      </Box>

      <Grid container spacing={3}>
        {goals.map((goal) => (
          <Grid item xs={12} sm={6} md={4} key={goal.id}>
            <Card 
              sx={{ 
                p: 3, 
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'scale(1.02)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
              onClick={() => handleGoalClick(goal.id)}
            >
              <Typography variant="h6" gutterBottom>
                {goal.title}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {goal.description}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {goal.deadline && (
                  <Typography variant="body2" color="text.secondary">
                    Due: {new Date(goal.deadline).toLocaleDateString()}
                  </Typography>
                )}
                {goal.progress !== undefined && (
                  <Typography variant="body2" color="text.secondary">
                    Progress: {goal.progress}%
                  </Typography>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
