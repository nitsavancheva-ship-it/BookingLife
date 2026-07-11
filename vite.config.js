import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        property: resolve(__dirname, 'property.html'),
        propertyEdit: resolve(__dirname, 'property-edit.html'),
        myBookings: resolve(__dirname, 'my-bookings.html'),
        myProperties: resolve(__dirname, 'my-properties.html'),
        profile: resolve(__dirname, 'profile.html'),
        admin: resolve(__dirname, 'admin.html'),
        notFound: resolve(__dirname, '404.html'),
      },
    },
  },
});
