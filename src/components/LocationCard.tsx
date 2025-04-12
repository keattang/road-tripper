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
  Button,
} from '@mui/material';
import { ExpandMore, ExpandLess, Add, Delete } from '@mui/icons-material';
import { Location, PointOfInterest } from '../types';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../utils/googleMapsLoader';

interface LocationCardProps {
  location: Location;
  onLocationChange: (location: Location) => void;
  onDelete?: (locationId: string) => void;
  onMapBoundsUpdate?: () => void;
}

const LocationCard = ({ location, onLocationChange, onDelete, onMapBoundsUpdate }: LocationCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [pointsOfInterest, setPointsOfInterest] = useState<PointOfInterest[]>(location.pointsOfInterest || []);
  const [locationInputValue, setLocationInputValue] = useState(location.name);
  const [poiInputValues, setPoiInputValues] = useState<{ [key: string]: string }>({});
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const poiAutocompleteRefs = useRef<{ [key: string]: google.maps.places.Autocomplete }>({});
  const poiInputRefs = useRef<{ [key: string]: HTMLInputElement }>({});
  
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  useEffect(() => {
    if (isLoaded && autocompleteRef.current && !autocomplete) {
      const options = {
        componentRestrictions: { country: "au" },
        fields: ["address_components", "geometry", "name", "formatted_address"],
        types: ["establishment", "geocode"],
      };
      
      const autocompleteInstance = new google.maps.places.Autocomplete(
        autocompleteRef.current,
        options
      );
      
      autocompleteInstance.addListener("place_changed", () => {
        const place = autocompleteInstance.getPlace();
        
        if (place.geometry?.location) {
          const newLocation: Location = {
            ...location,
            name: place.name || place.formatted_address || "",
            coordinates: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
          };
          
          setLocationInputValue(newLocation.name);
          onLocationChange(newLocation);
          
          if (onMapBoundsUpdate && isLoaded) {
            setTimeout(() => {
              onMapBoundsUpdate();
            }, 100);
          }
        }
      });
      
      setAutocomplete(autocompleteInstance);
    }
  }, [isLoaded, autocomplete, location, onLocationChange, onMapBoundsUpdate]);

  // Initialize POI autocomplete instances
  useEffect(() => {
    if (!isLoaded) return;

    pointsOfInterest.forEach((poi) => {
      const inputRef = poiInputRefs.current[poi.id];
      if (inputRef && !poiAutocompleteRefs.current[poi.id]) {
        const options = {
          componentRestrictions: { country: "au" },
          fields: ["address_components", "geometry", "name"],
          types: ["establishment", "geocode"],
        };

        const autocompleteInstance = new google.maps.places.Autocomplete(
          inputRef,
          options
        );

        autocompleteInstance.addListener("place_changed", () => {
          const place = autocompleteInstance.getPlace();
          
          if (place.geometry?.location) {
            const selectedName = place.name || place.formatted_address || "";
            
            // Update the input value state
            setPoiInputValues(prev => ({
              ...prev,
              [poi.id]: selectedName
            }));
            
            // Update the input field directly
            if (inputRef) {
              inputRef.value = selectedName;
            }
            
            const updatedPOIs = pointsOfInterest.map((p) =>
              p.id === poi.id
                ? {
                    ...p,
                    name: selectedName,
                    coordinates: {
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                    },
                  }
                : p
            );
            
            setPointsOfInterest(updatedPOIs);
            onLocationChange({
              ...location,
              pointsOfInterest: updatedPOIs,
            });

            if (onMapBoundsUpdate) {
              setTimeout(() => {
                onMapBoundsUpdate();
              }, 100);
            }
          }
        });

        poiAutocompleteRefs.current[poi.id] = autocompleteInstance;
      }
    });

    // Cleanup old autocomplete instances
    Object.keys(poiAutocompleteRefs.current).forEach((poiId) => {
      if (!pointsOfInterest.find((p) => p.id === poiId)) {
        delete poiAutocompleteRefs.current[poiId];
        delete poiInputRefs.current[poiId];
      }
    });
  }, [isLoaded, pointsOfInterest, location, onLocationChange, onMapBoundsUpdate]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      onLocationChange({
        ...location,
        arrivalDate: date,
      });
    }
  };

  const handleAddPointOfInterest = () => {
    const newPOI: PointOfInterest = {
      id: Date.now().toString(),
      name: '',
      coordinates: { lat: 0, lng: 0 },
      locationId: location.id,
    };
    const updatedPOIs = [...pointsOfInterest, newPOI];
    setPointsOfInterest(updatedPOIs);
    onLocationChange({
      ...location,
      pointsOfInterest: updatedPOIs,
    });
  };

  const handleRemovePointOfInterest = (poiId: string) => {
    const updatedPOIs = pointsOfInterest.filter((p) => p.id !== poiId);
    setPointsOfInterest(updatedPOIs);
    onLocationChange({
      ...location,
      pointsOfInterest: updatedPOIs,
    });
    if (onMapBoundsUpdate) {
      setTimeout(() => {
        onMapBoundsUpdate();
      }, 100);
    }
  };

  const handleLocationInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocationInputValue(event.target.value);
  };
  
  const handlePoiInputChange = (poiId: string, value: string) => {
    setPoiInputValues(prev => ({
      ...prev,
      [poiId]: value
    }));
  };

  const handleDeleteLocation = () => {
    if (onDelete) {
      onDelete(location.id);
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            inputRef={autocompleteRef}
            fullWidth
            label="Location Name"
            value={locationInputValue}
            onChange={handleLocationInputChange}
            placeholder="Search for a location..."
            sx={{ mr: 1 }}
          />
          <IconButton 
            onClick={handleDeleteLocation}
            aria-label="delete location"
          >
            <Delete />
          </IconButton>
        </Box>
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
                <TextField
                  inputRef={(el) => {
                    if (el) poiInputRefs.current[poi.id] = el;
                  }}
                  fullWidth
                  label="Point of Interest"
                  value={poiInputValues[poi.id] !== undefined ? poiInputValues[poi.id] : poi.name}
                  onChange={(e) => handlePoiInputChange(poi.id, e.target.value)}
                  placeholder="Search for a point of interest..."
                  sx={{ mr: 1 }}
                />
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleRemovePointOfInterest(poi.id)}
                >
                  <Delete />
                </IconButton>
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