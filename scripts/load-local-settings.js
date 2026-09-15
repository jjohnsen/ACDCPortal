const fs = require('node:fs');
const path = require('node:path');

function loadLocalSettings() {
    const settingsPath = process.env.ACDC_LOCAL_SETTINGS
        ? path.resolve(process.env.ACDC_LOCAL_SETTINGS)
        : path.join(__dirname, '..', 'api', 'local.settings.json');

    if (!fs.existsSync(settingsPath)) return null;

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    for (const [key, value] of Object.entries(settings.Values || {})) {
        if (process.env[key] === undefined) process.env[key] = String(value);
    }
    return settingsPath;
}

module.exports = { loadLocalSettings };
