import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/mechaflix/', // Nombre exacto de tu repositorio en GitHub
});