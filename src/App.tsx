import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useState } from 'react';
import TripPlanner from './components/TripPlanner';
import { Trip } from './types';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [trip, setTrip] = useState<Trip>({
    id: '1',
    name: 'My Road Trip',
    locations: [],
    pointsOfInterest: [],
    totalDays: 0,
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <TripPlanner trip={trip} onTripChange={setTrip} />
      </Box>
    </ThemeProvider>
  );
}

export default App;
