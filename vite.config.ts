import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/mapa/',
  build: {
    rolldownOptions: {
      output: {
        // Biblioteki zewnętrzne w osobnych paczkach: zmieniają się rzadko,
        // więc po kolejnym wdrożeniu przeglądarka bierze je z pamięci
        // zamiast pobierać od nowa (ważne przy słabym zasięgu).
        advancedChunks: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'leaflet', test: /node_modules[\\/](leaflet|react-leaflet)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)/ },
          ],
        },
      },
    },
  },
})
