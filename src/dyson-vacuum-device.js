const mqtt = require('mqtt');
const productTypeInfo = require('./productTypeInfo'); // Ensure this path matches your file structure

/**
 * Represents a Dyson Vacuum device.
 * @param platform The DysonVacuumPlatform instance.
 * @param name The name of the device.
 * @param serialNumber The serial number of the device.
 * @param productType The product type of the device.
 * @param version The firmware version of the device.
 * @param password The local MQTT password for the device.
 * @param config The device specific configuration.
 */
function DysonVacuumDevice(platform, name, serialNumber, productType, version, password, config) {
    const device = this;
    const { UUIDGen, Accessory, Characteristic, Service } = platform;

    // Retrieves the device info and checks if the device is a vacuum
    device.info = productTypeInfo(productType);
    if (!device.info.hasVacuum) {
        platform.log.error(`Device with serial number ${serialNumber} and product type ${productType} is not a vacuum.`);
        return;
    }

    // Logs the product type
    platform.log.info(`Vacuum device with serial number ${serialNumber}: product type ${productType}`);

    // Ensures that a name is set
    device.info.name = name || 'Dyson Vacuum'; 
    device.serialNumber = serialNumber;
    device.platform = platform;
    device.mqttClient = null;

    // Initialize device accessory
    let vacuumAccessory = new Accessory(device.info.name, UUIDGen.generate(serialNumber));
    vacuumAccessory.context.serialNumber = serialNumber;
    vacuumAccessory.context.kind = 'VacuumAccessory';

    // Accessory information service
    vacuumAccessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, 'Dyson')
        .setCharacteristic(Characteristic.Model, device.info.model)
        .setCharacteristic(Characteristic.SerialNumber, serialNumber)
        .setCharacteristic(Characteristic.FirmwareRevision, version);

    // Example: Implement a Fan service to control the vacuum's power
    // Note: Adjust this to fit the capabilities of your specific Dyson vacuum model
    const fanService = vacuumAccessory.addService(Service.Fan, `${device.info.name} Power`, 'vacuumPower');
    fanService.getCharacteristic(Characteristic.On)
        .on('set', (value, callback) => {
            // Here, you would send a command to the vacuum via MQTT
            platform.log.info(`Turning ${value ? 'on' : 'off'} the vacuum.`);
            callback();
        });

    // Add vacuumAccessory to Homebridge
    platform.api.registerPlatformAccessories("homebridge-dyson-vacuum", "DysonVacuum", [vacuumAccessory]);

    // MQTT setup for Dyson Vacuum
    const mqttOptions = {
        keepalive: 10,
        clientId: 'dyson_' + Math.random().toString(16).substr(2, 8),
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        username: serialNumber,
        password: password,
        rejectUnauthorized: false
    };

    const mqttUrl = `mqtt://${config.ipAddress}`;
    device.mqttClient = mqtt.connect(mqttUrl, mqttOptions);

    device.mqttClient.on('connect', () => {
        platform.log.info(`Connected to MQTT server for device ${serialNumber}.`);
        device.mqttClient.subscribe(productType + '/' + serialNumber + '/status/current');
    });

    device.mqttClient.on('message', (topic, message) => {
        // Handle incoming messages
        platform.log.debug(`MQTT message received: ${message.toString()}`);
        // Parse and update Homebridge characteristics based on the message
    });

    device.mqttClient.on('error', (error) => {
        platform.log.error(`MQTT error: ${error}`);
    });

    // Ensure to clean up correctly on shutdown
    platform.api.on('shutdown', () => device.shutdown());
}

DysonVacuumDevice.prototype.shutdown = function () {
    if (this.mqttClient) {
        this.mqttClient.end();
        this.platform.log.info('MQTT client disconnected');
    }
}

module.exports = DysonVacuumDevice;
