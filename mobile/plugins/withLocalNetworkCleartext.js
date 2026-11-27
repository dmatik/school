const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Allow cleartext HTTP for local development, Android emulator host (10.0.2.2), and Maestro E2E -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">127.0.0.1</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
  </domain-config>
</network-security-config>
`;

const DEBUG_NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- In Debug builds, allow cleartext HTTP to any LAN IP for Expo Metro & local dev servers -->
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

/**
 * Expo config plugin that mirrors iOS NSAllowsLocalNetworking on Android by
 * writing res/xml/network_security_config.xml permitting cleartext HTTP only
 * for loopback / emulator host addresses while keeping HTTPS enforced for all
 * other domains.
 */
function withLocalNetworkCleartext(config) {
  config = withAndroidManifest(config, (modConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      modConfig.modResults
    );
    mainApplication.$['android:networkSecurityConfig'] =
      '@xml/network_security_config';
    return modConfig;
  });

  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const mainXmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      fs.mkdirSync(mainXmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(mainXmlDir, 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG_XML,
        'utf8'
      );

      const debugXmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app/src/debug/res/xml'
      );
      fs.mkdirSync(debugXmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(debugXmlDir, 'network_security_config.xml'),
        DEBUG_NETWORK_SECURITY_CONFIG_XML,
        'utf8'
      );
      return modConfig;
    },
  ]);

  return config;
}

module.exports = withLocalNetworkCleartext;
