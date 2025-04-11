import { LoadScriptProps, Libraries } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from '../config';

export const GOOGLE_MAPS_LOADER_OPTIONS: LoadScriptProps = {
  googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  libraries: GOOGLE_MAPS_LIBRARIES as Libraries,
  id: 'google-map-script', // Use a consistent ID across all components
  version: 'weekly',
  language: 'en',
  region: 'US',
}; 