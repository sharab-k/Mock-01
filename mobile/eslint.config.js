// Local config so ESLint's flat-config resolution stops here instead of
// walking up into the web app's C:\Mock-01\eslint.config.mjs (a Next.js
// config that isn't compatible with this RN/Expo project — see the two
// projects' isolation notes in the root tsconfig.json and eslint.config.mjs).
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
