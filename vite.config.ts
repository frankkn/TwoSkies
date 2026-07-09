import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 版號單一來源：package.json；設定面板顯示、release tag 都以它為準
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
