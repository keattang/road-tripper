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
  onMapBoundsUpdate?: () => void;
  onDelete?: () => void;
}

const LocationCard = ({ location, onLocationChange, onMapBoundsUpdate, onDelete }: LocationCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [pointsOfInterest, setPointsOfInterest] = useState<PointOfInterest[]>(location.pointsOfInterest || []);
  const [locationInputValue, setLocationInputValue] = useState(location.name);
  const [poiInputValues, setPoiInputValues] = useState<{ [key: string]: string }>({});
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const poiAutocompleteRefs = useRef<{ [key: string]: google.maps.places.Autocomplete }>({});
  const poiInputRefs = useRef<{ [key: string]: HTMLInputElement }>({});
  
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close location autocomplete
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach(container => {
          if (container instanceof HTMLElement) {
            container.style.display = 'none';
          }
        });
      }

      // Close POI autocompletes
      let clickedInsidePoiInput = false;
      Object.values(poiInputRefs.current).forEach(inputRef => {
        if (inputRef && inputRef.contains(event.target as Node)) {
          clickedInsidePoiInput = true;
        }
      });

      if (!clickedInsidePoiInput) {
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach(container => {
          if (container instanceof HTMLElement) {
            container.style.display = 'none';
          }
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        
        if (place.geometry && place.geometry.location) {
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

    // Create a function to initialize autocomplete for a POI
    const initializeAutocompleteForPoi = (poi: PointOfInterest, inputRef: HTMLInputElement) => {
      if (poiAutocompleteRefs.current[poi.id]) return; // Already initialized

      const options = {
        componentRestrictions: { country: "au" },
        fields: ["address_components", "geometry", "name", "formatted_address"],
        types: ["establishment", "geocode"],
      };

      const autocompleteInstance = new google.maps.places.Autocomplete(
        inputRef,
        options
      );

      autocompleteInstance.addListener("place_changed", () => {
        const place = autocompleteInstance.getPlace();
        
        if (place.geometry && place.geometry.location) {
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
                    lat: place.geometry!.location!.lat(),
                    lng: place.geometry!.location!.lng(),
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
    };

    // Initialize autocomplete for all POIs
    pointsOfInterest.forEach((poi) => {
      const inputRef = poiInputRefs.current[poi.id];
      if (inputRef) {
        initializeAutocompleteForPoi(poi, inputRef);
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
      parentLocationName: location.name
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
  };

  const handleLocationInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocationInputValue(event.target.value);
  };
  
  const handlePoiInputChange = (poiId: string, value: string) => {
    setPoiInputValues(prev => ({
      ...prev,
      [poiId]: value
    }));
    
    // Trigger a search when the input value changes
    if (isLoaded && poiInputRefs.current[poiId]) {
      const inputRef = poiInputRefs.current[poiId];
      
      // If autocomplete doesn't exist for this POI, create it
      if (!poiAutocompleteRefs.current[poiId]) {
        const poi = pointsOfInterest.find(p => p.id === poiId);
        if (poi) {
          const options = {
            componentRestrictions: { country: "au" },
            fields: ["address_components", "geometry", "name", "formatted_address"],
            types: ["establishment", "geocode"],
          };

          const autocompleteInstance = new google.maps.places.Autocomplete(
            inputRef,
            options
          );

          autocompleteInstance.addListener("place_changed", () => {
            const place = autocompleteInstance.getPlace();
            
            if (place.geometry && place.geometry.location) {
              const selectedName = place.name || place.formatted_address || "";
              
              // Update the input value state
              setPoiInputValues(prev => ({
                ...prev,
                [poiId]: selectedName
              }));
              
              // Update the input field directly
              if (inputRef) {
                inputRef.value = selectedName;
              }
              
              // Create a new array with all POIs, updating only the one being edited
              const updatedPOIs = pointsOfInterest.map((p) =>
                p.id === poiId
                  ? {
                      ...p,
                      name: selectedName,
                      coordinates: {
                        lat: place.geometry!.location!.lat(),
                        lng: place.geometry!.location!.lng(),
                      },
                      parentLocationName: location.name // Ensure parentLocationName is always set
                    }
                  : p
              );
              
              // Update the local state
              setPointsOfInterest(updatedPOIs);
              
              // Update the parent component with the complete location object
              onLocationChange({
                ...location,
                pointsOfInterest: updatedPOIs,
              });
            }
          });

          poiAutocompleteRefs.current[poiId] = autocompleteInstance;
        }
      }
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <TextField
            inputRef={autocompleteRef}
            fullWidth
            label="Location Name"
            value={locationInputValue}
            onChange={handleLocationInputChange}
            sx={{ mb: 2 }}
            placeholder="Search for a location..."
          />
          {onDelete && (
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={onDelete}
              sx={{ mt: 1 }}
            >
              <Delete />
            </IconButton>
          )}
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