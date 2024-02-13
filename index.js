
const DysonVacuumPlatform = require('./src/dyson-vacuum-platform');

/**
 * Defines the export of the platform module.
 * @param homebridge The homebridge object that contains all classes, objects and functions for communicating with HomeKit.
 */
module.exports = function (homebridge) {
    homebridge.registerPlatform("homebridge-dyson-heurist", "DysonVacuumPlatform", DysonVacuumPlatform, true);

}
