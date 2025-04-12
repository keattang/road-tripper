import { Box, Button, Typography } from '@mui/material';
import { Trip, Location, PointOfInterest } from '../types';
import LocationCard from './LocationCard';
import { differenceInDays, addDays } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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

    // Collect all points of interest from all locations
    const allPointsOfInterest: PointOfInterest[] = [];
    locationsWithNights.forEach(location => {
      location.pointsOfInterest.forEach(poi => {
        // Add locationId to each POI if not already set
        if (!poi.locationId) {
          poi.locationId = location.id;
        }
        allPointsOfInterest.push(poi);
      });
    });

    onTripChange({
      ...trip,
      locations: locationsWithNights,
      pointsOfInterest: allPointsOfInterest,
      totalDays,
      routes: [], // Clear routes to force recalculation
    });
  };

  const handleDeleteLocation = (locationId: string) => {
    const updatedLocations = trip.locations.filter(loc => loc.id !== locationId);
    
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

    // Collect all points of interest from remaining locations
    const allPointsOfInterest: PointOfInterest[] = [];
    locationsWithNights.forEach(location => {
      location.pointsOfInterest.forEach(poi => {
        if (!poi.locationId) {
          poi.locationId = location.id;
        }
        allPointsOfInterest.push(poi);
      });
    });

    onTripChange({
      ...trip,
      locations: locationsWithNights,
      pointsOfInterest: allPointsOfInterest,
      totalDays,
      routes: [], // Clear routes to force recalculation
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(trip.locations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Calculate nights stayed for each location
    const locationsWithNights = items.map((loc, index) => {
      if (index === items.length - 1) return loc;
      
      const nextLocation = items[index + 1];
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

    // Collect all points of interest from all locations
    const allPointsOfInterest: PointOfInterest[] = [];
    locationsWithNights.forEach(location => {
      location.pointsOfInterest.forEach(poi => {
        if (!poi.locationId) {
          poi.locationId = location.id;
        }
        allPointsOfInterest.push(poi);
      });
    });

    onTripChange({
      ...trip,
      locations: locationsWithNights,
      pointsOfInterest: allPointsOfInterest,
      totalDays,
      routes: [], // Clear routes to force recalculation
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {trip.name}
      </Typography>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="locations">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {trip.locations.map((location, index) => (
                <Draggable key={location.id} draggableId={location.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        opacity: snapshot.isDragging ? 0.8 : 1,
                      }}
                    >
                      <Box key={location.id}>
                        <LocationCard
                          location={location}
                          onLocationChange={handleLocationChange}
                          onMapBoundsUpdate={onMapBoundsUpdate}
                          onDelete={() => handleDeleteLocation(location.id)}
                        />
                        {index < trip.locations.length - 1 && (
                          <Box sx={{ my: 1, textAlign: 'center' }} data-testid="driving-time-section">
                            <Typography variant="body2" color="primary">
                              Driving time: {trip.routes?.[index]?.drivingTime || 'Calculating...'}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button
        variant="contained"
        fullWidth
        onClick={handleAddLocation}
        sx={{ mt: 2 }}
      >
        Add Location
      </Button>

      <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
        Total days: {trip.totalDays}
      </Typography>
    </Box>
  );
};

export default LocationList; 