const knownProducts = {
  'N223': { // Dyson 360 Eye
    model: 'Dyson 360 Eye Robot Vacuum',
    hasVacuum: true,
  },
  '276': { // Dyson 360 Heurist
    model: 'Dyson 360 Heurist Robot Vacuum',
    hasVacuum: true,
  },
};

module.exports = function(productType) {
  const info = knownProducts[productType] || {};
  // Default values for optional properties
  info.hardwareRevision = info.hardwareRevision || '';
  info.hasAdvancedAirQualitySensors = info.hasAdvancedAirQualitySensors || false;
  info.hasHeating = info.hasHeating || false;
  info.hasHumidifier = info.hasHumidifier || false;
  info.hasJetFocus = info.hasJetFocus || false;
  info.model = info.model || 'Unknown Dyson Vacuum';
  return info;
};
