import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Ajoute cette section pour forcer la compilation correcte
  optimizeDeps: {
    include: ['recharts', 'es-toolkit']
  },
  build: {
    // Tu peux retirer le minify: false maintenant qu'on a trouvé le problème !
  }
})