import { Box, Paper } from '@mui/material';
import { Trip } from '../types';
import LocationList, { LocationListRef } from './LocationList';
import TripMap, { TripMapRef } from './TripMap';
import { useRef } from 'react';

interface TripPlannerProps {
  trip: Trip;
  onTripChange: (trip: Trip) => void;
}

const TripPlanner = ({ trip, onTripChange }: TripPlannerProps) => {
  const mapRef = useRef<TripMapRef>(null);
  const locationListRef = useRef<LocationListRef>(null);

  const handleMapBoundsUpdate = () => {
    console.log('TripPlanner: handleMapBoundsUpdate called');
    if (mapRef.current) {
      console.log('TripPlanner: Calling fitMapToLocations on map ref');
      mapRef.current.fitMapToLocations();
    } else {
      console.warn('TripPlanner: mapRef.current is null');
    }
  };

  const handleRoutesUpdate = (newRoutes: Trip['routes']) => {
    onTripChange({
      ...trip,
      routes: newRoutes
    });
  };

  const handleMarkerClick = (locationId: string) => {
    if (locationListRef.current) {
      locationListRef.current.scrollToLocation(locationId);
    }
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
          ref={locationListRef}
        />
      </Paper>
      <Box sx={{ flexGrow: 1, height: '100%' }}>
        <TripMap 
          trip={trip} 
          ref={mapRef}
          onRoutesUpdate={handleRoutesUpdate}
          onMarkerClick={handleMarkerClick}
        />
      </Box>
    </>
  );
};

export default TripPlanner; 