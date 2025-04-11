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

// Local storage key for saving trip data
const TRIP_STORAGE_KEY = 'road-tripper-trip-data';

// Interface for location data from localStorage (with date as string)
interface StoredLocation extends Omit<Location, 'arrivalDate'> {
  arrivalDate: string;
}

function App() {
  // Initialize state from local storage or with default values
  const [trip, setTrip] = useState<Trip>(() => {
    // Try to load from local storage
    const savedTrip = localStorage.getItem(TRIP_STORAGE_KEY);
    if (savedTrip) {
      try {
        const parsedTrip = JSON.parse(savedTrip);
        // Convert date strings back to Date objects
        return {
          ...parsedTrip,
          locations: parsedTrip.locations.map((loc: StoredLocation) => ({
            ...loc,
            arrivalDate: new Date(loc.arrivalDate)
          }))
        };
      } catch (error) {
        console.error('Error parsing saved trip data:', error);
        // Return default trip if parsing fails
        return createDefaultTrip();
      }
    }
    // Return default trip if nothing in local storage
    return createDefaultTrip();
  });

  // Save trip to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(trip));
  }, [trip]);

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

  // Helper function to create a default trip
  function createDefaultTrip(): Trip {
    return {
      id: '1',
      name: 'My Road Trip',
      locations: [],
      pointsOfInterest: [],
      totalDays: 0,
    };
  }

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
