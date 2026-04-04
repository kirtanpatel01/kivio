import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro(),
  ],
  server: {
    allowedHosts: [
      "unjuvenilely-nonveritable-kelsie.ngrok-free.dev",
    ],
  },
  environments: {
    ssr: { build: { rollupOptions: { input: "./server.ts" } } },
  },
})

export default config
