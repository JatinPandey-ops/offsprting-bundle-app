import React from 'react';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';

const PolarisProvider = ({ children }) => {
  return (
    <AppProvider i18n={enTranslations}>
      {children}
    </AppProvider>
  );
};

export default PolarisProvider;
