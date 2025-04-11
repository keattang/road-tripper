import { Box, Paper } from '@mui/material';
import { Trip } from '../types';
import LocationList from './LocationList';
import TripMap from './TripMap';
import { useRef, useState } from 'react';

interface TripPlannerProps {
  trip: Trip;
  onTripChange: (trip: Trip) => void;
}

const TripPlanner = ({ trip, onTripChange }: TripPlannerProps) => {
  const mapRef = useRef<{ fitMapToLocations: () => void } | null>(null);
  const [routes, setRoutes] = useState<Trip['routes']>([]);

  const handleMapBoundsUpdate = () => {
    if (mapRef.current) {
      mapRef.current.fitMapToLocations();
    }
  };

  const handleRoutesUpdate = (newRoutes: Trip['routes']) => {
    setRoutes(newRoutes);
    onTripChange({
      ...trip,
      routes: newRoutes
    });
  };

  return (
    <>
      <Paper
        elevation={3}
        sx={{
          width: '400px',
          height: '100%',
          overflow: 'auto',
          borderRadius: 0,
        }}
      >
        <LocationList 
          trip={trip} 
          onTripChange={onTripChange} 
          onMapBoundsUpdate={handleMapBoundsUpdate}
        />
      </Paper>
      <Box sx={{ flexGrow: 1, height: '100%' }}>
        <TripMap 
          trip={trip} 
          ref={mapRef}
          onRoutesUpdate={handleRoutesUpdate}
        />
      </Box>
    </>
  );
};

export default TripPlanner; 