import react from '@vitejs/plugin-react'
import { resolve } from 'path';
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  	plugins: [
		react(), 
		tailwindcss()
	],
	envDir: resolve(__dirname, '../')

})