export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^vite$': '<rootDir>/src/__mocks__/vite.ts',
    '^../config$': '<rootDir>/src/__mocks__/config.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(date-fns)/)'
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleDirectories: ['node_modules', 'src'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }
  }
}; 