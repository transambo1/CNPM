import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        '..', // cho phép truy cập thư mục cha
        path.resolve(__dirname, '../shared')
      ]
    },
    // Cấu hình proxy từ bước trước
    proxy: {
      '/osrm': {
        target: 'https://router.project-osrm.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/osrm/, ''),
      },
    },
  },

  // 👇 ĐẶT CẤU HÌNH TỐI ƯU HÓA Ở ĐÂY
  optimizeDeps: {
    include: ["leaflet", "leaflet-routing-machine"]
  },
})