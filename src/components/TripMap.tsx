import { useCallback, useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindowF } from '@react-google-maps/api';
import { Trip, Location, DrivingRoute, PointOfInterest } from '../types';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../utils/googleMapsLoader';
import { Box, Typography, CircularProgress } from '@mui/material';

interface TripMapProps {
  trip: Trip;
  onRoutesUpdate?: (routes: DrivingRoute[]) => void;
}

export interface TripMapRef {
  fitMapToLocations: () => void;
  recalculateRoutes: () => void;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

const TripMap = forwardRef<TripMapRef, TripMapProps>(({ trip, onRoutesUpdate }, ref) => {
  const [routes, setRoutes] = useState<DrivingRoute[]>([]);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const [placeDetails, setPlaceDetails] = useState<google.maps.places.PlaceResult | null>(null);
  const [poiDetails, setPoiDetails] = useState<google.maps.places.PlaceResult | null>(null);
  const [tempRoute, setTempRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isLoadingPoiDetails, setIsLoadingPoiDetails] = useState(false);
  const [isLoadingPlaceDetails, setIsLoadingPlaceDetails] = useState(false);

  // Add a ref to track if we're currently calculating routes
  const isCalculatingRef = useRef<boolean>(false);
  
  // Add a ref to track the last calculated locations
  const lastCalculatedLocationsRef = useRef<string>('');

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const fitMapToLocations = useCallback(() => {
    if (!mapRef.current) {
      return;
    }

    try {
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoordinates = false;
      
      // Add all locations to bounds
      if (trip.locations && trip.locations.length > 0) {
        trip.locations.forEach(location => {
          // Check if coordinates exist and are not zero
          if (location.coordinates && 
              location.coordinates.lat !== 0 && 
              location.coordinates.lng !== 0) {
            try {
              // Validate coordinates are within valid range
              if (
                location.coordinates.lat >= -90 && 
                location.coordinates.lat <= 90 && 
                location.coordinates.lng >= -180 && 
                location.coordinates.lng <= 180
              ) {
                bounds.extend({
                  lat: location.coordinates.lat,
                  lng: location.coordinates.lng
                });
                hasValidCoordinates = true;
              }
            } catch {
              // Invalid coordinates, skip this location
            }
          }
        });
      }
      
      // Add all points of interest to bounds
      if (trip.pointsOfInterest && trip.pointsOfInterest.length > 0) {
        trip.pointsOfInterest.forEach(poi => {
          // Check if coordinates exist and are not zero
          if (poi.coordinates && 
              poi.coordinates.lat !== 0 && 
              poi.coordinates.lng !== 0) {
            try {
              // Validate coordinates are within valid range
              if (
                poi.coordinates.lat >= -90 && 
                poi.coordinates.lat <= 90 && 
                poi.coordinates.lng >= -180 && 
                poi.coordinates.lng <= 180
              ) {
                bounds.extend({
                  lat: poi.coordinates.lat,
                  lng: poi.coordinates.lng
                });
                hasValidCoordinates = true;
              }
            } catch {
              // Invalid coordinates, skip this POI
            }
          }
        });
      }
      
      // Only fit bounds if we have valid coordinates
      if (hasValidCoordinates) {
        // Check if bounds are valid before fitting
        if (bounds.getNorthEast().lat() !== bounds.getSouthWest().lat() || 
            bounds.getNorthEast().lng() !== bounds.getSouthWest().lng()) {
          mapRef.current.fitBounds(bounds);
          
          // Add some padding to the bounds
          const listener = google.maps.event.addListenerOnce(mapRef.current, 'bounds_changed', () => {
            if (mapRef.current) {
              const currentZoom = mapRef.current.getZoom();
              if (currentZoom && currentZoom > 15) {
                mapRef.current.setZoom(15);
              }
            }
            google.maps.event.removeListener(listener);
          });
        } else {
          // If bounds are invalid (same point), just center on the first valid location
          const firstValidLocation = trip.locations.find(loc => 
            loc.coordinates && 
            loc.coordinates.lat !== 0 && 
            loc.coordinates.lng !== 0 &&
            loc.coordinates.lat >= -90 && 
            loc.coordinates.lat <= 90 && 
            loc.coordinates.lng >= -180 && 
            loc.coordinates.lng <= 180
          );
          
          if (firstValidLocation) {
            mapRef.current.setCenter({
              lat: firstValidLocation.coordinates.lat,
              lng: firstValidLocation.coordinates.lng
            });
            mapRef.current.setZoom(12);
          }
        }
      }
    } catch {
      // Error fitting map bounds
    }
  }, [trip]);

  const calculateRoute = useCallback(async (origin: Location, destination: Location) => {
    if (!directionsService) return null;

    // Validate that both locations have valid coordinates
    if (
      !origin.coordinates || 
      !destination.coordinates ||
      origin.coordinates.lat === 0 || 
      origin.coordinates.lng === 0 ||
      destination.coordinates.lat === 0 || 
      destination.coordinates.lng === 0 ||
      !isFinite(origin.coordinates.lat) || 
      !isFinite(origin.coordinates.lng) ||
      !isFinite(destination.coordinates.lat) || 
      !isFinite(destination.coordinates.lng)
    ) {
      console.warn('Invalid coordinates for route calculation:', 
        { origin: origin.name, destination: destination.name });
      return null;
    }

    try {
      const result = await directionsService.route({
        origin: { lat: origin.coordinates.lat, lng: origin.coordinates.lng },
        destination: { lat: destination.coordinates.lat, lng: destination.coordinates.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      });

      if (!result || !result.routes || result.routes.length === 0) {
        console.warn('No route found between:', 
          { origin: origin.name, destination: destination.name });
        return null;
      }

      const route: DrivingRoute = {
        origin,
        destination,
        drivingTime: result.routes[0].legs[0].duration?.text || '',
        distance: result.routes[0].legs[0].distance?.text || '',
        polyline: result.routes[0].overview_path?.map(point => ({
          lat: point.lat(),
          lng: point.lng(),
        })) || [],
      };

      return route;
    } catch (error) {
      console.error('Error calculating route:', error);
      return null;
    }
  }, [directionsService]);

  // Create a dedicated function for route calculation that can be called from multiple places
  const calculateAllRoutes = useCallback(async () => {
    // Skip if we don't have a directions service
    if (!directionsService) return;
    
    // Skip if we don't have at least 2 locations
    if (trip.locations.length < 2) return;
    
    // Skip if we're already calculating
    if (isCalculatingRef.current) return;
    
    // Skip if locations haven't changed since last calculation AND routes exist
    const locationsString = JSON.stringify(trip.locations);
    if (locationsString === lastCalculatedLocationsRef.current && trip.routes && trip.routes.length > 0) return;
    
    // Set calculating flag
    isCalculatingRef.current = true;
    
    try {
      // Check if we have any valid locations to calculate routes for
      const hasValidLocations = trip.locations.some(loc => 
        loc.coordinates.lat !== 0 && 
        loc.coordinates.lng !== 0 &&
        isFinite(loc.coordinates.lat) && 
        isFinite(loc.coordinates.lng)
      );
      
      if (!hasValidLocations) {
        console.log('No valid locations to calculate routes for');
        return;
      }
      
      const newRoutes: DrivingRoute[] = [];
      
      // Only calculate routes between consecutive locations that both have valid coordinates
      for (let i = 0; i < trip.locations.length - 1; i++) {
        const origin = trip.locations[i];
        const destination = trip.locations[i + 1];
        
        // Skip if either location has invalid coordinates
        if (
          origin.coordinates.lat === 0 || 
          origin.coordinates.lng === 0 ||
          destination.coordinates.lat === 0 || 
          destination.coordinates.lng === 0 ||
          !isFinite(origin.coordinates.lat) || 
          !isFinite(origin.coordinates.lng) ||
          !isFinite(destination.coordinates.lat) || 
          !isFinite(destination.coordinates.lng)
        ) {
          console.log('Skipping route calculation for locations with invalid coordinates');
          continue;
        }
        
        const route = await calculateRoute(origin, destination);
        if (route) {
          newRoutes.push(route);
        }
      }
      
      // Only update routes if we have valid ones
      if (newRoutes.length > 0) {
        setRoutes(newRoutes);
        
        // Notify parent component about the new routes
        if (onRoutesUpdate) {
          onRoutesUpdate(newRoutes);
        }
      }
      
      // Update the last calculated locations
      lastCalculatedLocationsRef.current = locationsString;
    } catch (error) {
      console.error('Error in route calculation:', error);
    } finally {
      isCalculatingRef.current = false;
    }
  }, [trip.locations, trip.routes, calculateRoute, directionsService, onRoutesUpdate]);

  // Add an effect to recalculate routes when they're cleared
  useEffect(() => {
    if (mapInitialized && (!trip.routes || trip.routes.length === 0)) {
      calculateAllRoutes();
    }
  }, [trip.routes, mapInitialized, calculateAllRoutes]);

  // Add an effect to handle trip data changes
  useEffect(() => {
    console.log('TripMap: Trip data changed, updating map');
    console.log('Trip data:', trip);
    
    // If the map is initialized, fit it to the locations
    if (mapInitialized && mapRef.current) {
      console.log('TripMap: Map is initialized, fitting to locations');
      // Use a small delay to ensure the trip data is fully processed
      setTimeout(() => {
        fitMapToLocations();
        calculateAllRoutes();
      }, 100);
    }
  }, [trip, mapInitialized, fitMapToLocations, calculateAllRoutes]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Initialize services
    if (isLoaded) {
      if (!directionsService) {
        setDirectionsService(new google.maps.DirectionsService());
      }
      if (!placesService) {
        setPlacesService(new google.maps.places.PlacesService(map));
      }

      // Set map as initialized after a short delay
      setTimeout(() => {
        setMapInitialized(true);
        // Calculate routes and fit map bounds after a short delay
        setTimeout(() => {
          calculateAllRoutes();
          fitMapToLocations();
        }, 500);
      }, 100);
    }
  }, [isLoaded, directionsService, placesService, calculateAllRoutes, fitMapToLocations]);

  // Add a function to manually trigger route calculation
  const recalculateRoutes = useCallback(() => {
    // Reset the last calculated locations to force recalculation
    lastCalculatedLocationsRef.current = '';
    calculateAllRoutes();
  }, [calculateAllRoutes]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMapInitialized(false);
  }, []);

  const handleMarkerClick = useCallback((location: Location | PointOfInterest, isPoi: boolean = false) => {
    if (isPoi) {
      setSelectedPoi(location as PointOfInterest);
      setSelectedLocation(null);
      setPlaceDetails(null);
      setIsLoadingPoiDetails(true);
      
      // Find the parent location for this POI
      const parentLocation = trip.locations.find(loc => 
        loc.pointsOfInterest.some(poi => poi.id === location.id)
      );
      
      // Calculate driving time from parent location to POI if we have both
      if (parentLocation && directionsService) {
        directionsService.route(
          {
            origin: { lat: parentLocation.coordinates.lat, lng: parentLocation.coordinates.lng },
            destination: { lat: location.coordinates.lat, lng: location.coordinates.lng },
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              const drivingTime = result.routes[0].legs[0].duration?.text;
              if (drivingTime) {
                // Update the POI's driving time
                (location as PointOfInterest).drivingTimeFromLocation = drivingTime;
                // Store the parent location name for display
                (location as PointOfInterest).parentLocationName = parentLocation.name;
                // Store the route result to display it
                setTempRoute(result);
              }
            }
          }
        );
      }
    } else {
      setSelectedLocation(location as Location);
      setSelectedPoi(null);
      setPoiDetails(null);
      setTempRoute(null);
      setIsLoadingPlaceDetails(true);
    }
    
    // Get place details if we have a places service
    if (placesService && location.coordinates.lat !== 0 && location.coordinates.lng !== 0) {
      // Function to fetch place details
      const fetchPlaceDetails = (placeId: string) => {
        placesService.getDetails(
          { 
            placeId, 
            fields: [
              'name',
              'formatted_address',
              'formatted_phone_number',
              'website',
              'rating',
              'reviews',
              'photos',
              'opening_hours',
              'price_level',
              'types',
              'url'
            ] 
          },
          (place, detailStatus) => {
            if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
              if (isPoi) {
                setPoiDetails(place);
                setIsLoadingPoiDetails(false);
              } else {
                setPlaceDetails(place);
                setIsLoadingPlaceDetails(false);
              }
            } else {
              // Handle error case
              if (isPoi) {
                setIsLoadingPoiDetails(false);
              } else {
                setIsLoadingPlaceDetails(false);
              }
            }
          }
        );
      };

      // Function to perform the search with different parameters
      const searchPlace = (searchParams: google.maps.places.TextSearchRequest) => {
        placesService.textSearch(
          searchParams,
          (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              const placeId = results[0].place_id;
              
              if (placeId) {
                fetchPlaceDetails(placeId);
              } else {
                // No place ID found
                if (isPoi) {
                  setIsLoadingPoiDetails(false);
                } else {
                  setIsLoadingPlaceDetails(false);
                }
              }
            } else {
              // No results found
              if (isPoi) {
                setIsLoadingPoiDetails(false);
              } else {
                setIsLoadingPlaceDetails(false);
              }
            }
          }
        );
      };

      // First try with nearbySearch using the exact coordinates and name
      placesService.nearbySearch(
        {
          location: new google.maps.LatLng(location.coordinates.lat, location.coordinates.lng),
          keyword: location.name, // Use the place name as a keyword
          type: 'establishment',
          rankBy: google.maps.places.RankBy.DISTANCE // Rank by distance for more accurate results
        },
        (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const placeId = results[0].place_id;
            
            if (placeId) {
              fetchPlaceDetails(placeId);
            } else {
              // If no place ID found, try textSearch with the name and a wider radius
              searchPlace({
                query: location.name,
                location: new google.maps.LatLng(location.coordinates.lat, location.coordinates.lng),
                radius: 50000 // 50km radius for text search
              });
            }
          } else {
            // If nearbySearch fails, try textSearch with the name and a wider radius
            searchPlace({
              query: location.name,
              location: new google.maps.LatLng(location.coordinates.lat, location.coordinates.lng),
              radius: 50000 // 50km radius for text search
            });
          }
        }
      );
    } else {
      // No places service or invalid coordinates
      if (isPoi) {
        setIsLoadingPoiDetails(false);
      } else {
        setIsLoadingPlaceDetails(false);
      }
    }
  }, [placesService, trip.locations, directionsService]);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedLocation(null);
    setSelectedPoi(null);
    setPlaceDetails(null);
    setPoiDetails(null);
    setTempRoute(null);
    setIsLoadingPoiDetails(false);
    setIsLoadingPlaceDetails(false);
  }, []);

  // Add keyboard event handler for Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (selectedLocation || selectedPoi)) {
        handleInfoWindowClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedLocation, selectedPoi, handleInfoWindowClose]);

  // Expose the fitMapToLocations and recalculateRoutes functions via ref
  useImperativeHandle(ref, () => ({
    fitMapToLocations,
    recalculateRoutes
  }), [fitMapToLocations, recalculateRoutes]);

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={10}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {mapInitialized && trip.locations.map((location) => (
        <Marker
          key={location.id}
          position={{
            lat: location.coordinates.lat,
            lng: location.coordinates.lng,
          }}
          icon={{
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          }}
          title={location.name}
          onClick={() => handleMarkerClick(location)}
        />
      ))}

      {mapInitialized && trip.pointsOfInterest.map((poi) => (
        <Marker
          key={poi.id}
          position={{
            lat: poi.coordinates.lat,
            lng: poi.coordinates.lng,
          }}
          icon={{
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          }}
          title={poi.name}
          onClick={() => handleMarkerClick(poi, true)}
        />
      ))}

      {mapInitialized && routes.map((route, index) => (
        <Polyline
          key={index}
          path={route.polyline}
          options={{
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
          }}
        />
      ))}

      {mapInitialized && tempRoute && tempRoute.routes[0] && (
        <Polyline
          path={tempRoute.routes[0].overview_path?.map(point => ({
            lat: point.lat(),
            lng: point.lng(),
          }))}
          options={{
            strokeColor: '#4285F4',
            strokeOpacity: 0.8,
            strokeWeight: 3,
            icons: [{
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 3,
              },
              offset: '50%',
              repeat: '100px'
            }]
          }}
        />
      )}

      {mapInitialized && selectedLocation && (
        <InfoWindowF
          position={{
            lat: selectedLocation.coordinates.lat,
            lng: selectedLocation.coordinates.lng,
          }}
          onCloseClick={handleInfoWindowClose}
        >
          <Box sx={{ maxWidth: 300, padding: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{selectedLocation.name}</Typography>
            {isLoadingPlaceDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 1 }}>Loading details...</Typography>
              </Box>
            ) : placeDetails ? (
              <>
                {placeDetails.photos && placeDetails.photos.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <img
                      src={placeDetails.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 })}
                      alt={selectedLocation.name}
                      style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
                    />
                  </Box>
                )}
                {/* Add driving time from previous location */}
                {trip.routes && trip.routes.length > 0 && (
                  <>
                    {trip.routes.map((route, index) => {
                      if (route.destination.id === selectedLocation.id) {
                        return (
                          <Typography key={`driving-time-${index}`} variant="body2" sx={{ mb: 1 }}>
                            <strong>Driving time from {route.origin.name}:</strong> {route.drivingTime}
                          </Typography>
                        );
                      }
                      return null;
                    })}
                  </>
                )}
                {selectedLocation.arrivalDate && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Arrival:</strong> {selectedLocation.arrivalDate.toLocaleDateString()}
                    {selectedLocation.nightsStayed !== undefined && (
                      <span> • {selectedLocation.nightsStayed} night{selectedLocation.nightsStayed !== 1 ? 's' : ''}</span>
                    )}
                  </Typography>
                )}
                {placeDetails.formatted_address && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Address:</strong> {placeDetails.formatted_address}
                  </Typography>
                )}
                {placeDetails.formatted_phone_number && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Phone:</strong> {placeDetails.formatted_phone_number}
                  </Typography>
                )}
                {placeDetails.opening_hours && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Hours:</strong><br />
                    {placeDetails.opening_hours.weekday_text?.map((day, index) => (
                      <span key={index}>{day}<br /></span>
                    ))}
                  </Typography>
                )}
                {placeDetails.rating && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Rating:</strong> {placeDetails.rating} / 5
                    {placeDetails.price_level && (
                      <span> • Price Level: {'$'.repeat(placeDetails.price_level)}</span>
                    )}
                  </Typography>
                )}
                {placeDetails.website && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Website:</strong>{' '}
                    <a href={placeDetails.website.toString()} target="_blank" rel="noopener noreferrer">
                      Visit Website
                    </a>
                  </Typography>
                )}
                {placeDetails.url && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <a href={placeDetails.url.toString()} target="_blank" rel="noopener noreferrer">
                      View on Google Maps
                    </a>
                  </Typography>
                )}
                {selectedLocation.pointsOfInterest.length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                      Points of Interest:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {selectedLocation.pointsOfInterest.map(poi => (
                        <li key={poi.id}>
                          {poi.name}
                          {poi.drivingTimeFromLocation && ` (${poi.drivingTimeFromLocation})`}
                        </li>
                      ))}
                    </Box>
                  </>
                )}
              </>
            ) : null}
          </Box>
        </InfoWindowF>
      )}

      {mapInitialized && selectedPoi && (
        <InfoWindowF
          position={{
            lat: selectedPoi.coordinates.lat,
            lng: selectedPoi.coordinates.lng,
          }}
          onCloseClick={handleInfoWindowClose}
        >
          <Box sx={{ maxWidth: 300, padding: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{selectedPoi.name}</Typography>
            {isLoadingPoiDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 1 }}>Loading details...</Typography>
              </Box>
            ) : poiDetails ? (
              <>
                {poiDetails.photos && poiDetails.photos.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <img
                      src={poiDetails.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 })}
                      alt={selectedPoi.name}
                      style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
                    />
                  </Box>
                )}
                {selectedPoi.drivingTimeFromLocation && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Driving time from {selectedPoi.parentLocationName || 'location'}:</strong> {selectedPoi.drivingTimeFromLocation}
                  </Typography>
                )}
                {poiDetails.formatted_address && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Address:</strong> {poiDetails.formatted_address}
                  </Typography>
                )}
                {poiDetails.formatted_phone_number && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Phone:</strong> {poiDetails.formatted_phone_number}
                  </Typography>
                )}
                {poiDetails.opening_hours && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Hours:</strong><br />
                    {poiDetails.opening_hours.weekday_text?.map((day, index) => (
                      <span key={index}>{day}<br /></span>
                    ))}
                  </Typography>
                )}
                {poiDetails.rating && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Rating:</strong> {poiDetails.rating} / 5
                    {poiDetails.price_level && (
                      <span> • Price Level: {'$'.repeat(poiDetails.price_level)}</span>
                    )}
                  </Typography>
                )}
                {poiDetails.website && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Website:</strong>{' '}
                    <a href={poiDetails.website.toString()} target="_blank" rel="noopener noreferrer">
                      Visit Website
                    </a>
                  </Typography>
                )}
                {poiDetails.url && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <a href={poiDetails.url.toString()} target="_blank" rel="noopener noreferrer">
                      View on Google Maps
                    </a>
                  </Typography>
                )}
              </>
            ) : null}
          </Box>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
});

export default TripMap; 