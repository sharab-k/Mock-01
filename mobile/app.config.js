// Extends app.json. Push notifications need Firebase's google-services.json on
// Android; it is added to the build only when the file is present, so a checkout
// without it still starts and builds (push registration then simply fails soft).
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const file = path.join(__dirname, 'google-services.json');
  if (!fs.existsSync(file)) return config;
  return { ...config, android: { ...config.android, googleServicesFile: './google-services.json' } };
};
