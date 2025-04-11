import { Box, Button, Typography } from '@mui/material';
import { Trip, Location } from '../types';
import LocationCard from './LocationCard';
import { differenceInDays, addDays } from 'date-fns';

interface LocationListProps {
  trip: Trip;
  onTripChange: (trip: Trip) => void;
  onMapBoundsUpdate?: () => void;
}

const LocationList = ({ trip, onTripChange, onMapBoundsUpdate }: LocationListProps) => {
  const handleAddLocation = () => {
    // Get the last location's arrival date or use today if no locations exist
    const lastLocation = trip.locations[trip.locations.length - 1];
    const defaultArrivalDate = lastLocation 
      ? addDays(lastLocation.arrivalDate, 1) 
      : new Date();

    const newLocation: Location = {
      id: new Date().getTime().toString(),
      name: '',
      coordinates: {
        lat: 0,
        lng: 0
      },
      arrivalDate: defaultArrivalDate,
      pointsOfInterest: []
    };

    const updatedTrip = {
      ...trip,
      locations: [...trip.locations, newLocation],
    };
    onTripChange(updatedTrip);
  };

  const handleLocationChange = (updatedLocation: Location) => {
    const updatedLocations = trip.locations.map((loc) =>
      loc.id === updatedLocation.id ? updatedLocation : loc
    );

    // Calculate nights stayed for each location
    const locationsWithNights = updatedLocations.map((loc, index) => {
      if (index === updatedLocations.length - 1) return loc;
      
      const nextLocation = updatedLocations[index + 1];
      const nightsStayed = differenceInDays(
        nextLocation.arrivalDate,
        loc.arrivalDate
      );

      return {
        ...loc,
        nightsStayed,
      };
    });

    const totalDays = locationsWithNights.reduce((total, loc) => {
      return total + (loc.nightsStayed || 0);
    }, 0);

    onTripChange({
      ...trip,
      locations: locationsWithNights,
      totalDays,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {trip.name}
      </Typography>
      
      {trip.locations.map((location, index) => (
        <Box key={location.id}>
          <LocationCard
            location={location}
            onLocationChange={handleLocationChange}
            onMapBoundsUpdate={onMapBoundsUpdate}
          />
          {index < trip.locations.length - 1 && (
            <Box sx={{ my: 1, textAlign: 'center' }} data-testid="driving-time-section">
              <Typography variant="body2" color="primary">
                Driving time: {trip.routes?.[index]?.drivingTime || 'Calculating...'}
              </Typography>
            </Box>
          )}
        </Box>
      ))}

      <Button
        variant="contained"
        fullWidth
        onClick={handleAddLocation}
        sx={{ mt: 2 }}
      >
        Add Location
      </Button>

      <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }} data-testid="total-days">
        Total Days: {trip.totalDays}
      </Typography>
    </Box>
  );
};

export default LocationList; 