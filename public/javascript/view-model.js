const ViewModel = function (viewData) {
	const self = this;

	this.errorMessage = ko.observable(viewData.errorMessage)
	this.devices = ko.observableArray();
	this.deviceMap = {}

	this.updateDevice = function(deviceId, switchState) {
		self.deviceMap[deviceId].switchState(switchState)
	}

	for (const device of viewData.devices) {
		const deviceModel = new Device(this, device)
		self.devices.push(deviceModel)
		self.deviceMap[device.deviceId] = deviceModel
	}
};
