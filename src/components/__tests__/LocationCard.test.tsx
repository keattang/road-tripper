import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Autocomplete } from '@mui/material';
import LocationCard from '../LocationCard';
import { Location } from '../../types/Location';
import type { TextFieldProps } from '@mui/material';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../utils/googleMapsLoader';

// Mock @react-google-maps/api
jest.mock('@react-google-maps/api', () => ({
  useJsApiLoader: jest.fn().mockReturnValue({ isLoaded: true, loadError: null }),
}));

// Mock the config values
jest.mock('../config', () => ({
  GOOGLE_MAPS_API_KEY: 'mock-api-key',
  GOOGLE_MAPS_LIBRARIES: ['places'],
}));

// Mock the @mui/material components
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  Autocomplete: jest.fn(({ onChange, ...props }) => (
    <div data-testid="autocomplete">
      <input
        data-testid="location-input"
        onChange={(e) => onChange(e, e.target.value)}
        placeholder={props.placeholder}
      />
      <div data-testid="autocomplete-options">
        {props.options.map((option: { place_id: string; description: string }) => (
          <div
            key={option.place_id}
            data-testid={`option-${option.place_id}`}
            onClick={() => onChange(null, option)}
          >
            {option.description}
          </div>
        ))}
      </div>
    </div>
  )),
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  Typography: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="typography">{children}</div>
  ),
  TextField: ({ inputRef, onChange, value, label = '', ...props }: Partial<TextFieldProps> & { label?: string }) => (
    <input 
      ref={inputRef} 
      onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
      value={value || ''}
      data-testid={`input-${label}`}
      aria-label={label}
      name={label}
      {...props} 
    />
  ),
  IconButton: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button data-testid="icon-button" onClick={onClick}>
      {children}
    </button>
  ),
  Collapse: ({ children, in: isIn }: { children: React.ReactNode; in: boolean }) => (
    <div data-testid="collapse" data-expanded={isIn}>
      {isIn && children}
    </div>
  ),
  List: ({ children }: { children: React.ReactNode }) => <div data-testid="list">{children}</div>,
  ListItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="list-item">{children}</div>
  ),
  ListItemText: ({ primary, secondary }: { primary: string; secondary?: string }) => (
    <div data-testid="list-item-text">
      <div data-testid="primary-text">{primary}</div>
      {secondary && <div data-testid="secondary-text">{secondary}</div>}
    </div>
  ),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button data-testid="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

// Mock the @mui/x-date-pickers components
jest.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }: { label: string; value: Date; onChange: (date: Date | null) => void }) => (
    <input
      type="date"
      data-testid={`input-${label}`}
      value={value.toISOString().split('T')[0]}
      onChange={(e) => onChange(new Date(e.target.value))}
    />
  ),
}));

jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the Google Places Autocomplete service
const mockAutocompleteService = {
  getPlacePredictions: jest.fn((request, callback) => {
    callback(
      [
        {
          place_id: 'place1',
          description: 'New York, NY, USA',
        },
        {
          place_id: 'place2',
          description: 'Boston, MA, USA',
        },
      ],
      'OK'
    );
  }),
};

// Mock the Google Places service
const mockPlacesService = {
  getDetails: jest.fn((request, callback) => {
    callback(
      {
        name: 'Test Place',
        formatted_address: '123 Test St',
        geometry: {
          location: {
            lat: () => 40.7128,
            lng: () => -74.0060,
          },
        },
      },
      'OK'
    );
  }),
};

// Mock the window object
Object.defineProperty(window, 'google', {
  value: {
    maps: {
      places: {
        AutocompleteService: jest.fn(() => mockAutocompleteService),
        PlacesService: jest.fn(() => mockPlacesService),
        PlacesServiceStatus: {
          OK: 'OK',
        },
      },
    },
  },
  writable: true,
});

describe('LocationCard Component', () => {
  // Sample location data for testing
  const mockLocation: Location = {
    id: '1',
    name: 'New York',
    coordinates: {
      lat: 40.7128,
      lng: -74.0060,
    },
    arrivalDate: new Date('2023-01-01'),
    nightsStayed: 3,
    pointsOfInterest: [
      {
        id: '1',
        name: 'Central Park',
        coordinates: {
          lat: 40.7829,
          lng: -73.9654,
        },
        locationId: '1',
        drivingTimeFromLocation: '15 mins',
      },
      {
        id: '2',
        name: 'Times Square',
        coordinates: {
          lat: 40.7580,
          lng: -73.9855,
        },
        locationId: '1',
        drivingTimeFromLocation: '10 mins',
      },
    ],
  };

  // Mock callbacks
  const mockOnLocationChange = jest.fn();
  const mockOnMapBoundsUpdate = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <LocationCard
        location={mockLocation}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays the location name', () => {
    render(
      <LocationCard
        location={mockLocation}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('displays the arrival date', () => {
    render(
      <LocationCard
        location={mockLocation}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    expect(screen.getByText('Arrival Date:')).toBeInTheDocument();
    expect(screen.getByTestId('input-Arrival Date')).toHaveValue('2023-01-01');
  });

  it('displays the number of nights stayed', () => {
    render(
      <LocationCard
        location={mockLocation}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    expect(screen.getByText('Nights Stayed: 3')).toBeInTheDocument();
  });

  it('expands and collapses when clicked', () => {
    render(
      <LocationCard
        location={mockLocation}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    
    // Initially collapsed
    expect(screen.getByTestId('collapse')).toHaveAttribute('data-expanded', 'false');
    
    // Click to expand
    fireEvent.click(screen.getByTestId('card'));
    expect(screen.getByTestId('collapse')).toHaveAttribute('data-expanded', 'true');
    
    // Click to collapse
    fireEvent.click(screen.getByTestId('card'));
    expect(screen.getByTestId('collapse')).toHaveAttribute('data-expanded', 'false');
  });

  it('updates the location name when a place is selected from autocomplete', async () => {
    render(
      <LocationCard
        location={mockLocation}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    
    // Expand the card
    fireEvent.click(screen.getByTestId('card'));
    
    // Find the autocomplete input
    const input = screen.getByTestId('location-input');
    
    // Type in the input to trigger autocomplete
    fireEvent.change(input, { target: { value: 'New' } });
    
    // Wait for autocomplete options to appear
    await waitFor(() => {
      expect(screen.getByTestId('autocomplete-options')).toBeInTheDocument();
    });
    
    // Select an option
    fireEvent.click(screen.getByTestId('option-place1'));
    
    // Check if onLocationChange was called with the updated location
    expect(mockOnLocationChange).toHaveBeenCalledWith({
      ...mockLocation,
      name: 'New York, NY, USA',
      coordinates: { lat: 40.7128, lng: -74.0060 },
    });
    
    // Check if onMapBoundsUpdate was called
    expect(mockOnMapBoundsUpdate).toHaveBeenCalled();
  });

  it('updates the arrival date when changed', () => {
    render(
      <LocationCard
        location={mockLocation}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    
    // Find the arrival date input
    const input = screen.getByTestId('input-Arrival Date');
    
    // Change the date
    fireEvent.change(input, { target: { value: '2023-01-02' } });
    
    // Check if onLocationChange was called with the updated date
    expect(mockOnLocationChange).toHaveBeenCalledWith({
      ...mockLocation,
      arrivalDate: new Date('2023-01-02'),
    });
  });

  it('displays points of interest when expanded', () => {
    // Create a location with points of interest
    const locationWithPOIs: Location = {
      ...mockLocation,
      pointsOfInterest: [
        {
          id: '1',
          name: 'Central Park',
          coordinates: { lat: 40.7829, lng: -73.9654 },
          drivingTimeFromLocation: '15 mins',
          locationId: '1',
        },
        {
          id: '2',
          name: 'Times Square',
          coordinates: { lat: 40.7580, lng: -73.9855 },
          drivingTimeFromLocation: '20 mins',
          locationId: '1',
        },
      ],
    };
    
    render(
      <LocationCard
        location={locationWithPOIs}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    
    // Initially collapsed, so POIs should not be visible
    expect(screen.queryByText('Central Park')).not.toBeInTheDocument();
    expect(screen.queryByText('Times Square')).not.toBeInTheDocument();
    
    // Expand the card
    fireEvent.click(screen.getByTestId('card'));
    
    // Now POIs should be visible
    expect(screen.getByText('Central Park')).toBeInTheDocument();
    expect(screen.getByText('Times Square')).toBeInTheDocument();
    expect(screen.getByText('15 mins')).toBeInTheDocument();
    expect(screen.getByText('20 mins')).toBeInTheDocument();
  });

  it('adds a new point of interest when the add button is clicked', () => {
    render(
      <LocationCard
        location={mockLocation}
        onLocationChange={mockOnLocationChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    
    // Expand the card
    fireEvent.click(screen.getByTestId('card'));
    
    // Click the add POI button
    fireEvent.click(screen.getByText('Add Point of Interest'));
    
    // Check if onLocationChange was called with a new POI
    expect(mockOnLocationChange).toHaveBeenCalledWith(expect.objectContaining({
      pointsOfInterest: expect.arrayContaining([
        expect.objectContaining({
          name: '',
          coordinates: { lat: 0, lng: 0 },
        }),
      ]),
    }));
  });
}); 