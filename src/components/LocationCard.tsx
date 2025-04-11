import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  IconButton,
  Collapse,
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
} from '@mui/material';
import { ExpandMore, ExpandLess, Add } from '@mui/icons-material';
import { Location, PointOfInterest } from '../types';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../utils/googleMapsLoader';

interface LocationCardProps {
  location: Location;
  onLocationChange: (location: Location) => void;
  onMapBoundsUpdate?: () => void;
}

const LocationCard = ({ location, onLocationChange, onMapBoundsUpdate }: LocationCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [pointsOfInterest, setPointsOfInterest] = useState<PointOfInterest[]>([]);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const autocompleteRef = useRef<HTMLInputElement>(null);
  
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  useEffect(() => {
    if (isLoaded && autocompleteRef.current && !autocomplete) {
      const options = {
        componentRestrictions: { country: "au" },
        fields: ["address_components", "geometry", "name"],
        types: ["establishment", "geocode"],
      };
      
      const autocompleteInstance = new google.maps.places.Autocomplete(
        autocompleteRef.current,
        options
      );
      
      autocompleteInstance.addListener("place_changed", () => {
        const place = autocompleteInstance.getPlace();
        
        if (place.geometry && place.geometry.location) {
          const newLocation: Location = {
            ...location,
            name: place.name || place.formatted_address || "",
            coordinates: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
          };
          
          onLocationChange(newLocation);
          
          // Only notify parent to update map bounds if the API is loaded
          if (onMapBoundsUpdate && isLoaded) {
            // Add a small delay to ensure the map is ready
            setTimeout(() => {
              onMapBoundsUpdate();
            }, 100);
          }
        }
      });
      
      setAutocomplete(autocompleteInstance);
    }
  }, [isLoaded, autocomplete, location, onLocationChange, onMapBoundsUpdate]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      onLocationChange({
        ...location,
        arrivalDate: date,
      });
    }
  };

  const handleLocationNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onLocationChange({
      ...location,
      name: event.target.value,
    });
  };

  const handleAddPointOfInterest = () => {
    const newPOI: PointOfInterest = {
      id: Date.now().toString(),
      name: '',
      coordinates: { lat: 0, lng: 0 },
      locationId: location.id,
    };
    setPointsOfInterest([...pointsOfInterest, newPOI]);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <TextField
          inputRef={autocompleteRef}
          fullWidth
          label="Location Name"
          value={location.name}
          onChange={handleLocationNameChange}
          sx={{ mb: 2 }}
          placeholder="Search for a location..."
        />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Arrival Date"
            value={location.arrivalDate}
            onChange={handleDateChange}
          />
        </LocalizationProvider>
        {location.nightsStayed !== undefined && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Nights stayed: {location.nightsStayed}
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <IconButton onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          Points of Interest
        </Typography>
      </CardActions>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          <List>
            {pointsOfInterest.map((poi) => (
              <ListItem key={poi.id}>
                <ListItemText
                  primary={poi.name}
                  secondary={poi.drivingTimeFromLocation}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ mt: 2 }}>
            <Button
              startIcon={<Add />}
              onClick={handleAddPointOfInterest}
              fullWidth
            >
              Add Point of Interest
            </Button>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default LocationCard; 