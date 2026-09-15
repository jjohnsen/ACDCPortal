const net = require('node:net');
const { loadLocalSettings } = require('./load-local-settings');

const settingsPath = loadLocalSettings();
const required = ['SQL_CONNECTION_STRING', 'JWT_SECRET', 'MAIL_TRANSPORT', 'ACDC_ENV'];
const missing = required.filter(key => !process.env[key]);

if (!settingsPath) {
    console.error('Missing api/local.settings.json. Copy api/local.settings.example.json first.');
    process.exitCode = 1;
} else if (missing.length > 0) {
    console.error(`Missing required local settings: ${missing.join(', ')}`);
    process.exitCode = 1;
} else if (process.env.ACDC_ENV !== 'local') {
    console.error('ACDC_ENV must be "local" when using the local stack.');
    process.exitCode = 1;
} else if (process.env.MAIL_TRANSPORT !== 'console') {
    console.error('MAIL_TRANSPORT must be "console" for the safe local default.');
    process.exitCode = 1;
} else {
    console.log(`Loaded local settings from ${settingsPath}`);
    console.log('Local configuration is valid. Start Docker services, then run npm run db:init.');
}
