import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import TripMap from '../TripMap';
import { Trip, Location, DrivingRoute } from '../../types';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../utils/googleMapsLoader';

// Mock the Google Maps components
jest.mock('@react-google-maps/api', () => ({
  useJsApiLoader: jest.fn(),
  GoogleMap: jest.fn(({ children }) => <div data-testid="map">{children}</div>),
  Marker: jest.fn(({ position }) => (
    <div data-testid={`marker-${position.lat}-${position.lng}`} />
  )),
  Polyline: jest.fn(() => <div data-testid="polyline" />),
  InfoWindow: jest.fn(({ children }) => <div data-testid="info-window">{children}</div>),
}));

// Mock the Google Maps API
const mockGoogleMaps = {
  Map: jest.fn(),
  LatLng: jest.fn(),
  LatLngBounds: jest.fn(() => ({
    extend: jest.fn(),
    getNorthEast: jest.fn(() => ({ lat: jest.fn(() => 40), lng: jest.fn(() => -74) })),
    getSouthWest: jest.fn(() => ({ lat: jest.fn(() => 40), lng: jest.fn(() => -74) })),
  })),
  DirectionsService: jest.fn(() => ({
    route: jest.fn().mockResolvedValue({
      routes: [
        {
          legs: [
            {
              duration: { text: '2 hours' },
              distance: { text: '100 km' },
            },
          ],
          overview_path: [
            { lat: () => 40, lng: () => -74 },
            { lat: () => 41, lng: () => -75 },
          ],
        },
      ],
    }),
  })),
  places: {
    PlacesService: jest.fn(() => ({
      nearbySearch: jest.fn((request, callback) => {
        callback(
          [
            {
              place_id: 'test-place-id',
              name: 'Test Place',
            },
          ],
          'OK'
        );
      }),
      getDetails: jest.fn((request, callback) => {
        callback(
          {
            name: 'Test Place',
            formatted_address: '123 Test St',
            formatted_phone_number: '123-456-7890',
            website: 'https://test.com',
            rating: 4.5,
          },
          'OK'
        );
      }),
    })),
    PlacesServiceStatus: {
      OK: 'OK',
    },
  },
  TravelMode: {
    DRIVING: 'DRIVING',
  },
  event: {
    addListenerOnce: jest.fn((map, event, callback) => {
      callback();
      return 'listener-id';
    }),
    removeListener: jest.fn(),
  },
};

// Mock the window object
Object.defineProperty(window, 'google', {
  value: mockGoogleMaps,
  writable: true,
});

describe('TripMap Component', () => {
  // Sample trip data for testing
  const mockTrip: Trip = {
    id: '1',
    name: 'Test Trip',
    locations: [
      {
        id: '1',
        name: 'New York',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        arrivalDate: new Date('2023-01-01'),
        nightsStayed: 3,
        pointsOfInterest: [],
      },
      {
        id: '2',
        name: 'Boston',
        coordinates: { lat: 42.3601, lng: -71.0589 },
        arrivalDate: new Date('2023-01-04'),
        nightsStayed: 2,
        pointsOfInterest: [],
      },
    ],
    pointsOfInterest: [
      {
        id: '1',
        name: 'Central Park',
        coordinates: { lat: 40.7829, lng: -73.9654 },
        drivingTime: '15 mins',
        locationId: '1',
      },
    ],
  };

  // Mock ref for testing
  const mockRef = React.createRef();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock the useJsApiLoader hook to return isLoaded as true
    (useJsApiLoader as jest.Mock).mockReturnValue({ isLoaded: true });
  });

  it('renders without crashing', () => {
    render(<TripMap trip={mockTrip} ref={mockRef} />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('shows loading message when Google Maps API is not loaded', () => {
    (useJsApiLoader as jest.Mock).mockReturnValue({ isLoaded: false });
    render(<TripMap trip={mockTrip} ref={mockRef} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders markers for all locations', () => {
    render(<TripMap trip={mockTrip} ref={mockRef} />);
    const markers = screen.getAllByTestId('marker');
    expect(markers.length).toBe(mockTrip.locations.length + mockTrip.pointsOfInterest.length);
  });

  it('renders polylines for routes', async () => {
    // Mock the calculateRoute function to return a route
    const mockRoute: DrivingRoute = {
      origin: mockTrip.locations[0],
      destination: mockTrip.locations[1],
      drivingTime: '2 hours',
      distance: '100 km',
      polyline: [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 42.3601, lng: -71.0589 },
      ],
    };

    // Mock the onRoutesUpdate callback
    const onRoutesUpdate = jest.fn();
    
    render(<TripMap trip={mockTrip} onRoutesUpdate={onRoutesUpdate} ref={mockRef} />);
    
    // Wait for the routes to be calculated
    await waitFor(() => {
      expect(onRoutesUpdate).toHaveBeenCalled();
    });
    
    const polylines = screen.getAllByTestId('polyline');
    expect(polylines.length).toBeGreaterThan(0);
  });

  it('shows info window when a marker is clicked', async () => {
    render(<TripMap trip={mockTrip} ref={mockRef} />);
    
    // Find all markers
    const markers = screen.getAllByTestId('marker');
    
    // Simulate click on the first marker
    fireEvent.click(markers[0]);
    
    // Wait for the info window to appear
    await waitFor(() => {
      expect(screen.getByTestId('info-window')).toBeInTheDocument();
    });
    
    // Check if the info window contains the location name
    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('closes info window when close button is clicked', async () => {
    render(<TripMap trip={mockTrip} ref={mockRef} />);
    
    // Find all markers
    const markers = screen.getAllByTestId('marker');
    
    // Simulate click on the first marker
    fireEvent.click(markers[0]);
    
    // Wait for the info window to appear
    await waitFor(() => {
      expect(screen.getByTestId('info-window')).toBeInTheDocument();
    });
    
    // Find the close button and click it
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Wait for the info window to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('info-window')).not.toBeInTheDocument();
    });
  });

  it('exposes fitMapToLocations and recalculateRoutes methods via ref', () => {
    render(<TripMap trip={mockTrip} ref={mockRef} />);
    
    // Check if the ref has the expected methods
    expect(mockRef.current).toHaveProperty('fitMapToLocations');
    expect(mockRef.current).toHaveProperty('recalculateRoutes');
    
    // Call the methods and check if they don't throw errors
    expect(() => {
      (mockRef.current as any).fitMapToLocations();
      (mockRef.current as any).recalculateRoutes();
    }).not.toThrow();
  });

  it('handles invalid coordinates gracefully', async () => {
    // Create a trip with invalid coordinates
    const tripWithInvalidCoords: Trip = {
      ...mockTrip,
      locations: [
        {
          ...mockTrip.locations[0],
          coordinates: { lat: 0, lng: 0 }, // Invalid coordinates
        },
        {
          ...mockTrip.locations[1],
          coordinates: { lat: 42.3601, lng: -71.0589 }, // Valid coordinates
        },
      ],
    };
    
    // Mock console.warn to check if it's called
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    render(<TripMap trip={tripWithInvalidCoords} ref={mockRef} />);
    
    // Wait for any async operations to complete
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    
    // Restore console.warn
    consoleSpy.mockRestore();
  });

  it('handles route calculation errors gracefully', async () => {
    // Mock the DirectionsService to throw an error
    mockGoogleMaps.DirectionsService = jest.fn(() => ({
      route: jest.fn().mockRejectedValue(new Error('Route calculation failed')),
    }));
    
    // Mock console.error to check if it's called
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<TripMap trip={mockTrip} ref={mockRef} />);
    
    // Wait for any async operations to complete
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    
    // Restore console.error
    consoleSpy.mockRestore();
  });
});

describe('TripMap', () => {
  // Mock data
  const mockLocations: Location[] = [
    {
      id: '1',
      name: 'Location 1',
      coordinates: { lat: -33.8688, lng: 151.2093 },
      arrivalDate: new Date('2024-01-01'),
      nightsStayed: 2,
      pointsOfInterest: [],
    },
    {
      id: '2',
      name: 'Location 2',
      coordinates: { lat: -37.8136, lng: 144.9631 },
      arrivalDate: new Date('2024-01-03'),
      nightsStayed: 3,
      pointsOfInterest: [],
    },
  ];

  const mockRoutes: DrivingRoute[] = [
    {
      origin: mockLocations[0],
      destination: mockLocations[1],
      drivingTime: '8 hours',
      distance: '800 km',
      polyline: 'encoded_polyline_string',
    },
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock the useJsApiLoader hook to return isLoaded as true
    (useJsApiLoader as jest.Mock).mockReturnValue({ isLoaded: true });
  });

  it('renders loading state when Google Maps is not loaded', () => {
    // Mock the loader to return not loaded
    (useJsApiLoader as jest.Mock).mockReturnValue({ isLoaded: false });

    render(<TripMap locations={mockLocations} routes={mockRoutes} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the map when Google Maps is loaded', () => {
    render(<TripMap locations={mockLocations} routes={mockRoutes} />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('renders markers for all locations', () => {
    render(<TripMap locations={mockLocations} routes={mockRoutes} />);
    
    mockLocations.forEach((location) => {
      expect(
        screen.getByTestId(`marker-${location.coordinates.lat}-${location.coordinates.lng}`)
      ).toBeInTheDocument();
    });
  });

  it('renders polylines for routes', () => {
    render(<TripMap locations={mockLocations} routes={mockRoutes} />);
    expect(screen.getByTestId('polyline')).toBeInTheDocument();
  });
}); 