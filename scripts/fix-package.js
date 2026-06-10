import fs from 'fs';

const packageJson = {
  name: "achievem_system",
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "tsc -b && vite build",
    lint: "eslint .",
    preview: "vite preview",
    serve: "serve dist -l 3000",
    zip: "node scripts/zip.js",
    "build:zip": "npm run build && npm run zip"
  },
  dependencies: {
    autoprefixer: "^10.5.0",
    lucide-react: "^1.17.0",
    react: "^19.1.0",
    react-dom: "^19.1.0",
    tailwindcss: "^3.4.14"
  },
  devDependencies: {
    "@eslint/js": "^9.25.0",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    eslint: "^9.25.0",
    eslint-plugin-react-hooks: "^5.2.0",
    eslint-plugin-react-refresh: "^0.4.19",
    globals: "^16.0.0",
    serve: "^14.2.6",
    typescript: "~5.8.3",
    typescript-eslint: "^8.30.1",
    vite: "^6.3.5"
  }
};

fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
console.log('package.json 已修复');