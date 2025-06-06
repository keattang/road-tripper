import { Box, Button, Typography, IconButton, Menu, MenuItem, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Trip, Location, PointOfInterest } from '../types';
import LocationCard from './LocationCard';
import { differenceInDays, addDays, format } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InfoIcon from '@mui/icons-material/Info';
import PrintIcon from '@mui/icons-material/Print';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';

interface LocationListProps {
  trip: Trip;
  onTripChange: (trip: Trip) => void;
  onMapBoundsUpdate?: () => void;
}

export interface LocationListRef {
  scrollToLocation: (locationId: string) => void;
}

const LocationList = forwardRef<LocationListRef, LocationListProps>(({ trip, onTripChange, onMapBoundsUpdate }, ref) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationCardsRef = useRef<{ [key: string]: HTMLDivElement }>({});
  const isMenuOpen = Boolean(menuAnchorEl);

  const scrollToLocation = (locationId: string) => {
    const cardElement = locationCardsRef.current[locationId];
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToLocation
  }));

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

    // Calculate total days based on arrival dates
    const totalDays = updatedLocations.reduce((total, loc, index) => {
      if (index === updatedLocations.length - 1) return total;
      
      const nextLocation = updatedLocations[index + 1];
      const nightsStayed = differenceInDays(
        nextLocation.arrivalDate,
        loc.arrivalDate
      );
      
      return total + nightsStayed;
    }, 0);

    // Collect all points of interest from all locations
    const allPointsOfInterest: PointOfInterest[] = [];
    
    // First, add POIs from the updated location to preserve their order
    if (updatedLocation.pointsOfInterest && updatedLocation.pointsOfInterest.length > 0) {
      updatedLocation.pointsOfInterest.forEach(poi => {
        if (!poi.locationId) {
          poi.locationId = updatedLocation.id;
        }
        allPointsOfInterest.push(poi);
      });
    }
    
    // Then add POIs from other locations
    updatedLocations.forEach(location => {
      if (location.id !== updatedLocation.id) {
        location.pointsOfInterest.forEach(poi => {
          // Add locationId to each POI if not already set
          if (!poi.locationId) {
            poi.locationId = location.id;
          }
          allPointsOfInterest.push(poi);
        });
      }
    });

    // Check if only dates have changed
    const hasOnlyDatesChanged = updatedLocations.every((loc, index) => {
      const originalLoc = trip.locations[index];
      return loc.id === originalLoc.id && 
             loc.name === originalLoc.name &&
             loc.coordinates.lat === originalLoc.coordinates.lat &&
             loc.coordinates.lng === originalLoc.coordinates.lng;
    });

    onTripChange({
      ...trip,
      locations: updatedLocations,
      pointsOfInterest: allPointsOfInterest,
      totalDays,
      routes: hasOnlyDatesChanged ? trip.routes : [], // Keep existing routes if only dates changed
    });
  };

  const handleDeleteLocation = (locationId: string) => {
    const updatedLocations = trip.locations.filter(loc => loc.id !== locationId);
    
    // Calculate total days based on arrival dates
    const totalDays = updatedLocations.reduce((total, loc, index) => {
      if (index === updatedLocations.length - 1) return total;
      
      const nextLocation = updatedLocations[index + 1];
      const nightsStayed = differenceInDays(
        nextLocation.arrivalDate,
        loc.arrivalDate
      );
      
      return total + nightsStayed;
    }, 0);

    // Collect all points of interest from remaining locations
    const allPointsOfInterest: PointOfInterest[] = [];
    updatedLocations.forEach(location => {
      location.pointsOfInterest.forEach(poi => {
        if (!poi.locationId) {
          poi.locationId = location.id;
        }
        allPointsOfInterest.push(poi);
      });
    });

    onTripChange({
      ...trip,
      locations: updatedLocations,
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

    // Calculate total days based on arrival dates
    const totalDays = items.reduce((total, loc, index) => {
      if (index === items.length - 1) return total;
      
      const nextLocation = items[index + 1];
      const nightsStayed = differenceInDays(
        nextLocation.arrivalDate,
        loc.arrivalDate
      );
      
      return total + nightsStayed;
    }, 0);

    // Collect all points of interest from all locations
    const allPointsOfInterest: PointOfInterest[] = [];
    items.forEach(location => {
      location.pointsOfInterest.forEach(poi => {
        if (!poi.locationId) {
          poi.locationId = location.id;
        }
        allPointsOfInterest.push(poi);
      });
    });

    onTripChange({
      ...trip,
      locations: items,
      pointsOfInterest: allPointsOfInterest,
      totalDays,
      routes: [], // Clear routes to force recalculation
    });
  };

  const handleDownloadTrip = () => {
    // Create a JSON string from the trip data
    const tripData = JSON.stringify(trip, null, 2);
    
    // Create a Blob with the JSON data
    const blob = new Blob([tripData], { type: 'application/json' });
    
    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name.replace(/\s+/g, '_')}_trip.json`;
    
    // Append to the document, click it, and remove it
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    handleMenuClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        // Deserialize the data to convert date strings back to Date objects
        const uploadedTrip = deserializeTripData(parsedData);
        
        // Validate the uploaded trip data
        const validationResult = validateTripData(uploadedTrip);
        if (validationResult.isValid) {
          console.log('Trip data validated successfully, updating trip state...');
          // Update the trip state with the uploaded data
          onTripChange(uploadedTrip);
          
          // Trigger map bounds update to reflect the new locations
          if (onMapBoundsUpdate) {
            console.log('Triggering map bounds update...');
            onMapBoundsUpdate();
          } else {
            console.warn('onMapBoundsUpdate callback is not defined');
          }
        } else {
          setAlertMessage("Invalid trip data format. Please upload a valid trip file.");
          setValidationError(validationResult.errorMessage || "Unknown validation error");
        }
      } catch (error) {
        setAlertMessage("Error parsing the file. Please make sure it's a valid JSON file.");
        setValidationError(error instanceof Error ? error.message : String(error));
        console.error("Error parsing uploaded file:", error);
      }
    };
    
    reader.readAsText(file);
    
    // Reset the file input so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deserializeTripData = (data: unknown): Trip => {
    console.log('Deserializing trip data:', data);
    // Create a deep copy of the data
    const tripData = JSON.parse(JSON.stringify(data));
    
    // Convert date strings to Date objects for each location
    if (tripData.locations && Array.isArray(tripData.locations)) {
      console.log(`Found ${tripData.locations.length} locations to process`);
      tripData.locations = tripData.locations.map((location: Record<string, unknown>) => {
        // Log the location before processing
        console.log('Processing location:', location.name, 'with coordinates:', location.coordinates);
        
        // Convert arrivalDate string to Date object
        if (location.arrivalDate && typeof location.arrivalDate === 'string') {
          location.arrivalDate = new Date(location.arrivalDate);
        }
        
        // Ensure coordinates are properly formatted
        if (location.coordinates) {
          const coords = location.coordinates as Record<string, unknown>;
          // Check if coordinates are in the expected format
          if (typeof coords.lat === 'string') {
            coords.lat = parseFloat(coords.lat);
          }
          if (typeof coords.lng === 'string') {
            coords.lng = parseFloat(coords.lng);
          }
          
          // Validate coordinates are numbers and within valid ranges
          const lat = coords.lat as number;
          const lng = coords.lng as number;
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn('Invalid coordinates for location:', location.name, coords);
            // Instead of setting to 0,0, we'll remove the coordinates
            // This will allow the map to skip this location when fitting bounds
            delete location.coordinates;
          }
        } else {
          console.warn('Missing coordinates for location:', location.name);
          // Don't add default coordinates, just log the warning
        }
        
        // Remove nightsStayed property if it exists
        if ('nightsStayed' in location) {
          delete location.nightsStayed;
        }
        
        // Convert dates in points of interest if they exist
        if (location.pointsOfInterest && Array.isArray(location.pointsOfInterest)) {
          console.log(`Processing ${location.pointsOfInterest.length} POIs for location:`, location.name);
          location.pointsOfInterest = location.pointsOfInterest.map((poi: Record<string, unknown>) => {
            // Log the POI before processing
            console.log('Processing POI:', poi.name, 'with coordinates:', poi.coordinates);
            
            if (poi.arrivalDate && typeof poi.arrivalDate === 'string') {
              poi.arrivalDate = new Date(poi.arrivalDate);
            }
            
            // Ensure coordinates are properly formatted for POIs
            if (poi.coordinates) {
              const coords = poi.coordinates as Record<string, unknown>;
              // Check if coordinates are in the expected format
              if (typeof coords.lat === 'string') {
                coords.lat = parseFloat(coords.lat);
              }
              if (typeof coords.lng === 'string') {
                coords.lng = parseFloat(coords.lng);
              }
              
              // Validate coordinates are numbers and within valid ranges
              const lat = coords.lat as number;
              const lng = coords.lng as number;
              if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                console.warn('Invalid coordinates for POI:', poi.name, coords);
                // Instead of setting to 0,0, we'll remove the coordinates
                // This will allow the map to skip this POI when fitting bounds
                delete poi.coordinates;
              }
            } else {
              console.warn('Missing coordinates for POI:', poi.name);
              // Don't add default coordinates, just log the warning
            }
            
            return poi;
          });
        }
        
        return location;
      });
    }
    
    // Process trip-level points of interest
    if (tripData.pointsOfInterest && Array.isArray(tripData.pointsOfInterest)) {
      console.log(`Processing ${tripData.pointsOfInterest.length} trip-level POIs`);
      tripData.pointsOfInterest = tripData.pointsOfInterest.map((poi: Record<string, unknown>) => {
        // Log the POI before processing
        console.log('Processing trip-level POI:', poi.name, 'with coordinates:', poi.coordinates);
        
        if (poi.arrivalDate && typeof poi.arrivalDate === 'string') {
          poi.arrivalDate = new Date(poi.arrivalDate);
        }
        
        // Ensure coordinates are properly formatted for POIs
        if (poi.coordinates) {
          const coords = poi.coordinates as Record<string, unknown>;
          // Check if coordinates are in the expected format
          if (typeof coords.lat === 'string') {
            coords.lat = parseFloat(coords.lat);
          }
          if (typeof coords.lng === 'string') {
            coords.lng = parseFloat(coords.lng);
          }
          
          // Validate coordinates are numbers and within valid ranges
          const lat = coords.lat as number;
          const lng = coords.lng as number;
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn('Invalid coordinates for trip-level POI:', poi.name, coords);
            // Instead of setting to 0,0, we'll remove the coordinates
            // This will allow the map to skip this POI when fitting bounds
            delete poi.coordinates;
          }
        } else {
          console.warn('Missing coordinates for trip-level POI:', poi.name);
          // Don't add default coordinates, just log the warning
        }
        
        return poi;
      });
    }
    
    // Process routes if they exist
    if (tripData.routes && Array.isArray(tripData.routes)) {
      console.log(`Processing ${tripData.routes.length} routes`);
      // We don't need to do much with routes as they reference locations by ID
      // Just ensure they have the correct structure
      tripData.routes = tripData.routes.filter((route: Record<string, unknown>) => {
        return route.origin && route.destination && route.drivingTime && route.distance;
      });
    }
    
    console.log('Deserialized trip data:', tripData);
    return tripData as Trip;
  };

  const validateTripData = (data: unknown): { isValid: boolean; errorMessage?: string } => {
    // Basic validation to ensure the data has the expected structure
    if (!data || typeof data !== 'object') {
      return { isValid: false, errorMessage: "The uploaded data is not a valid object." };
    }
    
    const tripData = data as Record<string, unknown>;
    
    if (typeof tripData.name !== 'string') {
      return { isValid: false, errorMessage: "The trip must have a name property of type string." };
    }
    
    if (!Array.isArray(tripData.locations)) {
      return { isValid: false, errorMessage: "The trip must have a locations property that is an array." };
    }
    
    for (let i = 0; i < tripData.locations.length; i++) {
      const loc = tripData.locations[i];
      if (!loc || typeof loc !== 'object') {
        return { isValid: false, errorMessage: `Location at index ${i} is not a valid object.` };
      }
      
      const location = loc as Record<string, unknown>;
      
      if (typeof location.id !== 'string') {
        return { isValid: false, errorMessage: `Location at index ${i} must have an id property of type string.` };
      }
      
      if (typeof location.name !== 'string') {
        return { isValid: false, errorMessage: `Location at index ${i} must have a name property of type string.` };
      }
      
      if (!location.coordinates || typeof location.coordinates !== 'object') {
        return { isValid: false, errorMessage: `Location at index ${i} must have a coordinates property that is an object.` };
      }
      
      const coords = location.coordinates as Record<string, unknown>;
      if (typeof coords.lat !== 'number') {
        return { isValid: false, errorMessage: `Location at index ${i} must have coordinates.lat property of type number.` };
      }
      
      if (typeof coords.lng !== 'number') {
        return { isValid: false, errorMessage: `Location at index ${i} must have coordinates.lng property of type number.` };
      }
      
      if (!(location.arrivalDate instanceof Date)) {
        return { isValid: false, errorMessage: `Location at index ${i} must have an arrivalDate property that is a Date object.` };
      }
      
      if (!Array.isArray(location.pointsOfInterest)) {
        return { isValid: false, errorMessage: `Location at index ${i} must have a pointsOfInterest property that is an array.` };
      }
    }
    
    return { isValid: true };
  };

  const handleCloseAlert = () => {
    setAlertMessage(null);
  };

  const handleShowErrorDetails = () => {
    setShowErrorDialog(true);
  };

  const handleCloseErrorDialog = () => {
    setShowErrorDialog(false);
  };

  const handlePrintTrip = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setAlertMessage("Please allow pop-ups to print the trip details.");
      return;
    }

    // Create a new DirectionsService instance
    const directionsService = new google.maps.DirectionsService();

    // Function to calculate driving time between two points
    const calculateDrivingTime = async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Promise<string> => {
      return new Promise((resolve) => {
        directionsService.route(
          {
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              resolve(result.routes[0].legs[0].duration?.text || 'Unknown');
            } else {
              resolve('Unknown');
            }
          }
        );
      });
    };

    // Calculate driving times for all POIs
    const locationsWithDrivingTimes = await Promise.all(
      trip.locations.map(async (location) => {
        const poisWithDrivingTimes = await Promise.all(
          location.pointsOfInterest
            .filter(poi => poi.name.trim() !== '')
            .map(async (poi) => {
              if (!poi.drivingTimeFromLocation && poi.coordinates) {
                const drivingTime = await calculateDrivingTime(
                  location.coordinates,
                  poi.coordinates
                );
                return {
                  ...poi,
                  drivingTimeFromLocation: drivingTime
                };
              }
              return poi;
            })
        );

        return {
          ...location,
          pointsOfInterest: poisWithDrivingTimes
        };
      })
    );

    const formatDate = (date: Date) => format(date, 'MMMM d, yyyy');

    const printContent = `
      <html>
        <head>
          <title>${trip.name} - Trip Details</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1976d2; }
            .location { margin-bottom: 30px; }
            .location h2 { color: #2196f3; margin-bottom: 10px; }
            .poi { margin-left: 20px; margin-bottom: 10px; }
            .driving-time { color: #666; margin-bottom: 10px; }
            .nights { color: #666; margin-bottom: 10px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${trip.name}</h1>
          ${locationsWithDrivingTimes.map((location, index) => {
            const nextLocation = locationsWithDrivingTimes[index + 1];
            const nightsStayed = nextLocation 
              ? differenceInDays(nextLocation.arrivalDate, location.arrivalDate)
              : null;
            const drivingTime = index > 0 ? trip.routes?.[index - 1]?.drivingTime : null;
            
            // Filter out empty points of interest
            const validPointsOfInterest = location.pointsOfInterest.filter(poi => poi.name.trim() !== '');
            
            return `
              <div class="location">
                <h2>${location.name}</h2>
                ${drivingTime ? `
                  <div class="driving-time">
                    Driving time to this location: ${drivingTime}
                  </div>
                ` : ''}
                <div class="nights">Arrival: ${formatDate(location.arrivalDate)}</div>
                ${nightsStayed !== null ? `<div class="nights">Nights stayed: ${nightsStayed}</div>` : ''}
                
                ${validPointsOfInterest.length > 0 ? `
                  <h3>Things to do:</h3>
                  ${validPointsOfInterest.map(poi => `
                    <div class="poi">
                      • ${poi.name}
                      ${poi.drivingTimeFromLocation ? ` (${poi.drivingTimeFromLocation} from location)` : ''}
                    </div>
                  `).join('')}
                ` : ''}
              </div>
            `;
          }).join('')}
          <div class="no-print">
            <button onclick="window.print()">Print</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const calculateTripStats = () => {
    if (!trip.routes || trip.routes.length === 0) {
      return {
        totalDrivingTime: '0 min',
        totalDistance: '0 km',
        averageDrivingTime: '0 min',
        averageDistance: '0 km',
        totalLocations: trip.locations.length,
        totalPOIs: trip.pointsOfInterest.length,
        totalNights: trip.totalDays
      };
    }

    // Parse driving times and distances
    const drivingTimes = trip.routes.map(route => {
      const timeStr = route.drivingTime;
      const hours = timeStr.match(/(\d+)\s*h/)?.[1] || '0';
      const minutes = timeStr.match(/(\d+)\s*m/)?.[1] || '0';
      return parseInt(hours) * 60 + parseInt(minutes);
    });

    const distances = trip.routes.map(route => {
      const distanceStr = route.distance;
      const km = distanceStr.match(/(\d+(?:\.\d+)?)\s*km/)?.[1] || '0';
      return parseFloat(km);
    });

    // Calculate totals
    const totalMinutes = drivingTimes.reduce((sum, minutes) => sum + minutes, 0);
    const totalKm = distances.reduce((sum, km) => sum + km, 0);

    // Format total driving time
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalDrivingTime = hours > 0 
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;

    // Calculate averages
    const averageMinutes = Math.round(totalMinutes / trip.routes.length);
    const averageHours = Math.floor(averageMinutes / 60);
    const averageMinutesRemainder = averageMinutes % 60;
    const averageDrivingTime = averageHours > 0
      ? `${averageHours}h ${averageMinutesRemainder}m`
      : `${averageMinutesRemainder}m`;

    const averageDistance = (totalKm / trip.routes.length).toFixed(1);

    return {
      totalDrivingTime,
      totalDistance: `${totalKm.toFixed(1)} km`,
      averageDrivingTime,
      averageDistance: `${averageDistance} km`,
      totalLocations: trip.locations.length,
      totalPOIs: trip.pointsOfInterest.length,
      totalNights: trip.totalDays
    };
  };

  const handleShowStats = () => {
    setShowStatsDialog(true);
    handleMenuClose();
  };

  const handleCloseStats = () => {
    setShowStatsDialog(false);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
    }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          {trip.name}
        </Typography>
        <IconButton
          aria-label="more options"
          aria-controls={isMenuOpen ? 'trip-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={isMenuOpen ? 'true' : undefined}
          onClick={handleMenuOpen}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          id="trip-menu"
          anchorEl={menuAnchorEl}
          open={isMenuOpen}
          onClose={handleMenuClose}
          MenuListProps={{
            'aria-labelledby': 'trip-menu-button',
          }}
        >
          <MenuItem onClick={() => {
            handleDownloadTrip();
            handleMenuClose();
          }}>
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
            Download Trip
          </MenuItem>
          <MenuItem onClick={handleUploadClick}>
            <UploadIcon fontSize="small" sx={{ mr: 1 }} />
            Upload Trip
          </MenuItem>
          <MenuItem onClick={() => {
            handlePrintTrip();
            handleMenuClose();
          }}>
            <PrintIcon fontSize="small" sx={{ mr: 1 }} />
            Print Trip
          </MenuItem>
          <MenuItem onClick={handleShowStats}>
            <BarChartIcon fontSize="small" sx={{ mr: 1 }} />
            Trip Statistics
          </MenuItem>
        </Menu>
        <input
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
      </Box>
      
      <Box sx={{ 
        flex: 1,
        overflowY: 'auto',
        mb: 7, // Increase bottom margin to prevent content from being hidden behind the fixed bottom section
        '& > div': { // Style for the droppable container
          display: 'flex',
          flexDirection: 'column',
          gap: 2, // Add gap between cards
          p: 2 // Add padding to the inner content
        }
      }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="locations">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {trip.locations.map((location, index) => (
                  <Draggable key={location.id} draggableId={location.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={(el) => {
                          provided.innerRef(el);
                          if (el) {
                            locationCardsRef.current[location.id] = el;
                          }
                        }}
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
                            nextLocationArrivalDate={index < trip.locations.length - 1 ? trip.locations[index + 1].arrivalDate : undefined}
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
      </Box>

      <Box sx={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'background.paper',
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        zIndex: 10,
        boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleAddLocation}
            sx={{ flexShrink: 0 }}
          >
            Add Location
          </Button>

          {trip.locations.length > 0 && (
            <Box sx={{ flex: 1, textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary" noWrap>
                {format(trip.locations[0].arrivalDate, 'MMM d, yyyy')} - {
                  trip.locations[trip.locations.length - 1].arrivalDate 
                    ? format(trip.locations[trip.locations.length - 1].arrivalDate, 'MMM d, yyyy')
                    : 'TBD'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total days: {trip.totalDays}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar 
        open={!!alertMessage} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity="error" 
          sx={{ width: '100%' }}
          action={
            validationError && (
              <IconButton
                aria-label="more info"
                color="inherit"
                size="small"
                onClick={handleShowErrorDetails}
              >
                <InfoIcon />
              </IconButton>
            )
          }
        >
          {alertMessage}
        </Alert>
      </Snackbar>

      <Dialog
        open={showErrorDialog}
        onClose={handleCloseErrorDialog}
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
      >
        <DialogTitle id="error-dialog-title">
          Validation Error Details
        </DialogTitle>
        <DialogContent>
          <Typography id="error-dialog-description">
            {validationError}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseErrorDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showStatsDialog}
        onClose={handleCloseStats}
        aria-labelledby="stats-dialog-title"
        aria-describedby="stats-dialog-description"
      >
        <DialogTitle id="stats-dialog-title">
          Trip Statistics
        </DialogTitle>
        <DialogContent>
          {(() => {
            const stats = calculateTripStats();
            return (
              <Box sx={{ pt: 1 }}>
                <Typography variant="h6" gutterBottom>Overview</Typography>
                <Typography variant="body1" gutterBottom>
                  • Total Locations: {stats.totalLocations}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  • Total Points of Interest: {stats.totalPOIs}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  • Total Nights: {stats.totalNights}
                </Typography>

                <Typography variant="h6" sx={{ mt: 2 }} gutterBottom>Driving</Typography>
                <Typography variant="body1" gutterBottom>
                  • Total Driving Time: {stats.totalDrivingTime}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  • Total Distance: {stats.totalDistance}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  • Average Driving Time: {stats.averageDrivingTime}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  • Average Distance: {stats.averageDistance}
                </Typography>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStats} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default LocationList; 