/// <reference types="vite/client" />

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// Mock the window.matchMedia function
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock the ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock the IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Date.UTC
declare global {
  interface Date {
    UTC: jest.MockedFunction<typeof Date.UTC>;
  }
}

// Augment the ImportMetaEnv interface
interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GOOGLE_MAPS_LIBRARIES: string;
  readonly NODE_ENV: string;
}

// Set up the mock environment
const mockEnv: ImportMetaEnv = {
  VITE_GOOGLE_MAPS_API_KEY: 'mock-api-key',
  VITE_GOOGLE_MAPS_LIBRARIES: 'places',
  NODE_ENV: 'test'
};

// Mock import.meta.env
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: mockEnv
    }
  }
});

// Mock Date.UTC
Date.UTC = jest.fn((year: number, month: number, day: number): number => {
  return new Date(year, month, day).getTime();
}) as jest.MockedFunction<typeof Date.UTC>;

// Mock the Google Maps JavaScript API
const mockGoogle = {
  maps: {
    Map: jest.fn(() => ({
      setCenter: jest.fn(),
      setZoom: jest.fn(),
      fitBounds: jest.fn(),
      getZoom: jest.fn(() => 10),
    })),
    Marker: jest.fn(() => ({
      setMap: jest.fn(),
      setPosition: jest.fn(),
    })),
    DirectionsService: jest.fn(() => ({
      route: jest.fn().mockResolvedValue({
        routes: [{
          legs: [{
            duration: { text: '1 hour' },
            distance: { text: '50 km' },
          }],
          overview_path: [
            { lat: () => 40.7128, lng: () => -74.0060 },
            { lat: () => 40.7589, lng: () => -73.9851 },
          ],
        }],
      }),
    })),
    DirectionsRenderer: jest.fn(() => ({
      setMap: jest.fn(),
      setDirections: jest.fn(),
    })),
    LatLngBounds: jest.fn(() => ({
      extend: jest.fn(),
      getNorthEast: jest.fn(() => ({ lat: () => 40.7589, lng: () => -73.9851 })),
      getSouthWest: jest.fn(() => ({ lat: () => 40.7128, lng: () => -74.0060 })),
    })),
    places: {
      PlacesService: jest.fn(() => ({
        nearbySearch: jest.fn((request, callback) => {
          callback([{
            place_id: 'mock-place-id',
            name: 'Mock Place',
            geometry: {
              location: {
                lat: () => 40.7128,
                lng: () => -74.0060,
              },
            },
          }], 'OK');
        }),
        getDetails: jest.fn((request, callback) => {
          callback({
            name: 'Mock Place',
            formatted_address: '123 Mock St',
            formatted_phone_number: '123-456-7890',
            website: 'https://mock.com',
            rating: 4.5,
          }, 'OK');
        }),
      })),
      AutocompleteService: jest.fn(() => ({
        getPlacePredictions: jest.fn().mockResolvedValue({
          predictions: [
            { description: 'Mock Place 1', place_id: 'mock-place-1' },
            { description: 'Mock Place 2', place_id: 'mock-place-2' },
          ],
        }),
      })),
      PlacesServiceStatus: {
        OK: 'OK',
      },
    },
    Geocoder: jest.fn(() => ({
      geocode: jest.fn().mockResolvedValue([
        {
          geometry: {
            location: {
              lat: () => 40.7128,
              lng: () => -74.0060,
            },
          },
        },
      ]),
    })),
    importLibrary: jest.fn().mockResolvedValue({}),
    Animation: {
      DROP: 2,
    },
    BicyclingLayer: jest.fn(),
    Circle: jest.fn(),
    event: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addListenerOnce: jest.fn(),
    },
    LatLng: jest.fn((lat, lng) => ({
      lat: () => lat,
      lng: () => lng,
    })),
    TravelMode: {
      DRIVING: 'DRIVING',
    },
  },
};

// @ts-expect-error - Ignore type checking for the mock
global.google = mockGoogle; 