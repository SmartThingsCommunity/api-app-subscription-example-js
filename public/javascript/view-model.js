const ViewModel = function () {
	const self = this;

	this.errorMessage = ko.observable()
	this.devices = ko.observableArray();
	this.deviceMap = {}
	this.initialized = ko.observable()

	this.updateDevice = function(deviceId, switchState) {
		self.deviceMap[deviceId].switchState(switchState)
	}

	this.initialize = function(viewData) {
		for (const device of viewData.devices) {
			const deviceModel = new Device(this, device)
			self.devices.push(deviceModel)
			self.deviceMap[device.deviceId] = deviceModel
		}
		self.initialized(true)
		self.errorMessage(viewData.errorMessage)
	}
};
