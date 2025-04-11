import { Libraries } from '@react-google-maps/api';

// Configuration values that handle both test and production environments
const getGoogleMapsApiKey = () => {
  if (process.env.NODE_ENV === 'test') {
    return 'mock-api-key';
  }
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key is not set. Please check your .env file.');
    return '';
  }
  return apiKey;
};

const getGoogleMapsLibraries = (): Libraries => {
  if (process.env.NODE_ENV === 'test') {
    return ['places'] as Libraries;
  }
  
  const libraries = import.meta.env.VITE_GOOGLE_MAPS_LIBRARIES;
  if (!libraries) {
    console.error('Google Maps libraries are not set. Please check your .env file.');
    return ['places'] as Libraries; // Default to places library
  }
  return libraries.split(',') as Libraries;
};

export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
export const GOOGLE_MAPS_LIBRARIES = getGoogleMapsLibraries(); 