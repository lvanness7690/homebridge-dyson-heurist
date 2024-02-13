const DysonVacuumDevice = require('./dyson-vacuum-device');
const CredentialsGeneratorWebsite = require('./credentials-generator-website');

function DysonVacuumPlatform(log, config, api) {
    const platform = this;

    platform.Accessory = api.platformAccessory;
    platform.Categories = api.hap.Accessory.Categories;
    platform.Service = api.hap.Service;
    platform.Characteristic = api.hap.Characteristic;
    platform.UUIDGen = api.hap.uuid;
    platform.hap = api.hap;
    platform.pluginName = 'homebridge-dyson-vacuum';
    platform.platformName = 'DysonVacuumPlatform';

    if (!config) {
        return;
    }

    platform.log = log;
    platform.config = config;
    platform.devices = [];
    platform.accessories = [];

    api.on('shutdown', () => {
        platform.devices.forEach(device => device.shutdown());
    });

    if (!api) {
        log.warn('Homebridge API not available, please update your homebridge version!');
        return;
    }

    log.debug('Homebridge API available.');
    platform.api = api;

    platform.api.on('didFinishLaunching', () => {
        log.debug('Cached accessories loaded.');

        if (!platform.config.devices || !Array.isArray(platform.config.devices)) {
            log.warn('Check the devices property, it has to be a valid array.');
            return;
        }

        platform.config.devices.forEach(config => {
            try {
                let apiConfig = JSON.parse(Buffer.from(config.credentials.trim(), 'base64').toString('utf8'));
                platform.devices.push(new DysonVacuumDevice(platform, apiConfig.Name, apiConfig.Serial, apiConfig.ProductType, apiConfig.Version, apiConfig.LocalCredentials, config));
                log.info(`Initialized Dyson Vacuum Device for serial ${apiConfig.Serial}`);
            } catch (error) {
                log.warn(`Invalid device credentials for device with serial number ${config.serialNumber}. Make sure you copied them correctly. Error: ${error}`);
            }
        });

        let unusedAccessories = platform.accessories.filter(a => !platform.devices.some(d => d.serialNumber === a.context.serialNumber));
        unusedAccessories.forEach(accessory => {
            log.info(`Removing unused accessory with serial number ${accessory.context.serialNumber}`);
            platform.accessories.splice(platform.accessories.indexOf(accessory), 1);
        });
        platform.api.unregisterPlatformAccessories(platform.pluginName, platform.platformName, unusedAccessories);

        log.info('Accessories initialized.');
        platform.credentialsGeneratorWebsite = new CredentialsGeneratorWebsite(platform);
    });
}

DysonVacuumPlatform.prototype.configureAccessory = function(accessory) {
    this.accessories.push(accessory);
}

module.exports = DysonVacuumPlatform;
