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
 * @param config The device-specific configuration.
 */
function DysonVacuumDevice(platform, name, serialNumber, productType, version, password, config) {
    const device = this;
    const { UUIDGen, Accessory, Characteristic, Service } = platform;

    device.info = productTypeInfo(productType);
    if (!device.info.hasVacuum) {
        platform.log.error(`Device with serial number ${serialNumber} and product type ${productType} is not a vacuum.`);
        return;
    }

    platform.log.info(`Vacuum device with serial number ${serialNumber}: product type ${productType}`);
    device.info.name = name || 'Dyson Vacuum';
    device.serialNumber = serialNumber;
    device.platform = platform;
    device.mqttClient = null;

    let vacuumAccessory = new Accessory(device.info.name, UUIDGen.generate(serialNumber));
    vacuumAccessory.context.serialNumber = serialNumber;
    vacuumAccessory.context.kind = 'VacuumAccessory';

    vacuumAccessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, 'Dyson')
        .setCharacteristic(Characteristic.Model, device.info.model)
        .setCharacteristic(Characteristic.SerialNumber, serialNumber)
        .setCharacteristic(Characteristic.FirmwareRevision, version);

    // Example service setup for vacuum control (adjust as needed)
    // This example assumes a Fan service to simulate turning the vacuum on/off
    const fanService = vacuumAccessory.addService(Service.Fan, `${device.info.name} Control`, 'vacuumControl');
    fanService.getCharacteristic(Characteristic.On)
        .on('set', (value, callback) => {
            const command = {
                msg: 'STATE-SET',
                time: new Date().toISOString(),
                data: { state: value ? 'ON' : 'OFF' } // Example command structure
            };
            platform.log.info(`Sending command to vacuum: ${JSON.stringify(command)}`);
            device.mqttClient.publish(`${productType}/${serialNumber}/command`, JSON.stringify(command));
            callback();
        });

    platform.api.registerPlatformAccessories("homebridge-dyson-vacuum", "DysonVacuum", [vacuumAccessory]);

    // Initializes the MQTT client for local communication with the device
    device.mqttClient = mqtt.connect(`mqtt://${config.ipAddress}`, {
        username: serialNumber,
        password: password,
        protocolVersion: 3,
        protocolId: 'MQIsdp'
    });

    device.mqttClient.on('connect', () => {
        platform.log.info(`Connected to MQTT server for device ${serialNumber}.`);
        device.mqttClient.subscribe(`${productType}/${serialNumber}/status/current`);
    });

    device.mqttClient.on('message', (topic, message) => {
        platform.log.debug(`MQTT message received: ${message.toString()}`);
        // Handle the message, update characteristics as needed
    });

    device.mqttClient.on('error', (error) => {
        platform.log.error(`MQTT error: ${error}`);
    });

    platform.api.on('shutdown', () => device.shutdown());
}

DysonVacuumDevice.prototype.shutdown = function () {
    if (this.mqttClient) {
        this.mqttClient.end();
        this.platform.log.info('MQTT client disconnected');
    }
}

module.exports = DysonVacuumDevice;
