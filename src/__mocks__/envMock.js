// Mock for import.meta.env
global.import = {
  meta: {
    env: {
      VITE_GOOGLE_MAPS_API_KEY: 'mock-api-key',
      VITE_GOOGLE_MAPS_LIBRARIES: 'places',
      NODE_ENV: 'test',
    },
  },
}; 