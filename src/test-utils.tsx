import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {children}
    </LocalizationProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render }; 