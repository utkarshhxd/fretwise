import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Another local app answers on 127.0.0.1:5173 on this machine.
  server: { host: '127.0.0.1', port: 5199 },
})
