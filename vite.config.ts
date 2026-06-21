import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

function glslPlugin(): Plugin {
  return {
    name: 'vite-plugin-glsl',
    transform(code, id) {
      if (id.endsWith('.glsl') || id.endsWith('.vert') || id.endsWith('.frag')) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: null,
        }
      }
    },
  }
}

export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths(),
    glslPlugin()
  ],
})
