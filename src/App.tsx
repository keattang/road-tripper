import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useState, useEffect } from 'react';
import TripPlanner from './components/TripPlanner';
import { Trip, Location } from './types';

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

  // Initialize with an empty location if there are no locations
  useEffect(() => {
    if (trip.locations.length === 0) {
      const emptyLocation: Location = {
        id: new Date().getTime().toString(),
        name: '',
        coordinates: {
          lat: 0,
          lng: 0
        },
        arrivalDate: new Date(),
        pointsOfInterest: []
      };

      setTrip(prevTrip => ({
        ...prevTrip,
        locations: [emptyLocation]
      }));
    }
  }, []);

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
