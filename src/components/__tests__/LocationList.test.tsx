import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationList from '../LocationList';
import { Trip, Location } from '../../types';

// Mock the LocationCard component
jest.mock('../LocationCard', () => {
  return function MockLocationCard({ location, onLocationChange }: { location: Location; onLocationChange: (location: Location) => void }) {
    return (
      <div data-testid="location-card" data-location-id={location.id}>
        <div data-testid="location-name">{location.name}</div>
        <div data-testid="location-date">
          {location.arrivalDate.toISOString().split('T')[0]}
        </div>
        <div data-testid="location-nights">Nights: {location.nightsStayed}</div>
        <button
          data-testid="update-location"
          onClick={() =>
            onLocationChange({
              ...location,
              name: `Updated ${location.name}`,
            })
          }
        >
          Update
        </button>
      </div>
    );
  };
});

describe('LocationList Component', () => {
  const mockTrip: Trip = {
    id: '1',
    name: 'Test Trip',
    locations: [
      {
        id: '1',
        name: 'New York',
        coordinates: {
          lat: 40.7128,
          lng: -74.0060
        },
        arrivalDate: new Date('2023-01-01'),
        nightsStayed: 3
      },
      {
        id: '2',
        name: 'Boston',
        coordinates: {
          lat: 42.3601,
          lng: -71.0589
        },
        arrivalDate: new Date('2023-01-04'),
        nightsStayed: 2
      },
      {
        id: '3',
        name: 'Chicago',
        coordinates: {
          lat: 41.8781,
          lng: -87.6298
        },
        arrivalDate: new Date('2023-01-06'),
        nightsStayed: 4
      }
    ],
    pointsOfInterest: [],
    totalDays: 9
  };

  const mockOnTripChange = jest.fn();
  const mockOnMapBoundsUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <LocationList
        trip={mockTrip}
        onTripChange={mockOnTripChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    expect(screen.getByText('Test Trip')).toBeInTheDocument();
  });

  it('renders all location cards', () => {
    render(
      <LocationList
        trip={mockTrip}
        onTripChange={mockOnTripChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    
    mockTrip.locations.forEach(location => {
      expect(screen.getByText(location.name)).toBeInTheDocument();
    });
  });

  it('displays driving time between locations', () => {
    render(
      <LocationList
        trip={mockTrip}
        onTripChange={mockOnTripChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );
    
    const drivingTimeElements = screen.getAllByTestId('driving-time-section');
    expect(drivingTimeElements.length).toBe(mockTrip.locations.length - 1);
  });

  it('displays the total days for the trip', () => {
    render(
      <LocationList
        trip={mockTrip}
        onTripChange={mockOnTripChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );

    const totalDays = mockTrip.locations.reduce((total, location) => total + (location.nightsStayed || 0), 0);
    expect(screen.getByTestId('total-days')).toHaveTextContent(`Total Days: ${totalDays}`);
  });

  it('adds a new location when the add button is clicked', () => {
    render(
      <LocationList
        trip={mockTrip}
        onTripChange={mockOnTripChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );

    fireEvent.click(screen.getByText('Add Location'));

    expect(mockOnTripChange).toHaveBeenCalledWith(
      expect.objectContaining({
        locations: expect.arrayContaining([
          expect.objectContaining({
            name: '',
            coordinates: {
              lat: 0,
              lng: 0
            }
          })
        ])
      })
    );
  });

  it('updates a location when the update button is clicked', () => {
    render(
      <LocationList
        trip={mockTrip}
        onTripChange={mockOnTripChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );

    const updateButtons = screen.getAllByTestId('update-location');
    fireEvent.click(updateButtons[0]);

    expect(mockOnTripChange).toHaveBeenCalledWith(
      expect.objectContaining({
        locations: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: 'Updated New York'
          })
        ])
      })
    );
  });

  it('calls onMapBoundsUpdate when a location is updated', () => {
    render(
      <LocationList
        trip={mockTrip}
        onTripChange={mockOnTripChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );

    const updateButtons = screen.getAllByTestId('update-location');
    fireEvent.click(updateButtons[0]);

    expect(mockOnMapBoundsUpdate).toHaveBeenCalled();
  });

  it('sets default arrival date for new locations based on the last location', () => {
    const tripWithSpecificDate: Trip = {
      ...mockTrip,
      locations: [
        {
          ...mockTrip.locations[0],
          arrivalDate: new Date('2023-01-01'),
          nightsStayed: 2
        }
      ],
      pointsOfInterest: [],
      totalDays: 2
    };

    render(
      <LocationList
        trip={tripWithSpecificDate}
        onTripChange={mockOnTripChange}
        onMapBoundsUpdate={mockOnMapBoundsUpdate}
      />
    );

    fireEvent.click(screen.getByText('Add Location'));

    expect(mockOnTripChange).toHaveBeenCalledWith(
      expect.objectContaining({
        locations: expect.arrayContaining([
          expect.objectContaining({
            arrivalDate: new Date('2023-01-03')
          })
        ])
      })
    );
  });
}); 