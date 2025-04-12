import { useCallback, useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindowF } from '@react-google-maps/api';
import { Trip, Location, DrivingRoute, PointOfInterest } from '../types';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../utils/googleMapsLoader';

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
  const [mapInitialized, setMapInitialized] = useState(false);

  // Add a ref to track if we're currently calculating routes
  const isCalculatingRef = useRef<boolean>(false);
  
  // Add a ref to track the last calculated locations
  const lastCalculatedLocationsRef = useRef<string>('');

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const fitMapToLocations = useCallback(() => {
    if (!mapRef.current || trip.locations.length === 0) return;

    try {
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoordinates = false;
      
      // Add all locations to bounds
      trip.locations.forEach(location => {
        if (location.coordinates.lat !== 0 && location.coordinates.lng !== 0) {
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
            } else {
              console.warn('Coordinates out of valid range for location:', location.name);
            }
          } catch {
            console.warn('Invalid coordinates for location:', location.name);
          }
        }
      });
      
      // Add all points of interest to bounds
      trip.pointsOfInterest.forEach(poi => {
        if (poi.coordinates.lat !== 0 && poi.coordinates.lng !== 0) {
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
            } else {
              console.warn('Coordinates out of valid range for POI:', poi.name);
            }
          } catch {
            console.warn('Invalid coordinates for POI:', poi.name);
          }
        }
      });
      
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
    } catch (error) {
      console.error('Error fitting map bounds:', error);
    }
  }, [trip.locations, trip.pointsOfInterest]);

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
    } else {
      setSelectedLocation(location as Location);
      setSelectedPoi(null);
      setPoiDetails(null);
    }
    
    // Get place details if we have a places service
    if (placesService && location.coordinates.lat !== 0 && location.coordinates.lng !== 0) {
      // Use the correct method for the Places API
      placesService.nearbySearch(
        {
          location: new google.maps.LatLng(location.coordinates.lat, location.coordinates.lng),
          radius: 100,
          type: 'establishment'
        },
        (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const placeId = results[0].place_id;
            
            // Only proceed if we have a valid placeId
            if (placeId) {
              // Get detailed information about the place
              placesService.getDetails(
                { 
                  placeId, 
                  fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'reviews', 'photos'] 
                },
                (place, detailStatus) => {
                  if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                    if (isPoi) {
                      setPoiDetails(place);
                    } else {
                      setPlaceDetails(place);
                    }
                  }
                }
              );
            }
          }
        }
      );
    }
  }, [placesService]);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedLocation(null);
    setSelectedPoi(null);
    setPlaceDetails(null);
    setPoiDetails(null);
  }, []);

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

      {mapInitialized && selectedLocation && (
        <InfoWindowF
          position={{
            lat: selectedLocation.coordinates.lat,
            lng: selectedLocation.coordinates.lng,
          }}
          onCloseClick={handleInfoWindowClose}
        >
          <div>
            <h3>{selectedLocation.name}</h3>
            {placeDetails && (
              <>
                {placeDetails.formatted_address && (
                  <p><strong>Address:</strong> {placeDetails.formatted_address}</p>
                )}
                {placeDetails.formatted_phone_number && (
                  <p><strong>Phone:</strong> {placeDetails.formatted_phone_number}</p>
                )}
                {placeDetails.website && (
                  <p><strong>Website:</strong> <a href={placeDetails.website.toString()} target="_blank" rel="noopener noreferrer">Visit Website</a></p>
                )}
                {placeDetails.rating && (
                  <p><strong>Rating:</strong> {placeDetails.rating} / 5</p>
                )}
              </>
            )}
          </div>
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
          <div>
            <h3>{selectedPoi.name}</h3>
            {poiDetails && (
              <>
                {poiDetails.formatted_address && (
                  <p><strong>Address:</strong> {poiDetails.formatted_address}</p>
                )}
                {poiDetails.formatted_phone_number && (
                  <p><strong>Phone:</strong> {poiDetails.formatted_phone_number}</p>
                )}
                {poiDetails.website && (
                  <p><strong>Website:</strong> <a href={poiDetails.website.toString()} target="_blank" rel="noopener noreferrer">Visit Website</a></p>
                )}
                {poiDetails.rating && (
                  <p><strong>Rating:</strong> {poiDetails.rating} / 5</p>
                )}
              </>
            )}
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
});

export default TripMap; 