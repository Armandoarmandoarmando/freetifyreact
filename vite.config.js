import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: fs.existsSync('../freetify/localhost.key') && fs.existsSync('../freetify/localhost.crt') ? {
      key: fs.readFileSync('../freetify/localhost.key'),
      cert: fs.readFileSync('../freetify/localhost.crt'),
    } : false,
    port: 5173,
    host: '127.0.0.1'
  }
})
