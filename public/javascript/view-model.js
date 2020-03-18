const ViewModel = function () {
	const self = this;

	this.errorMessage = ko.observable()
	this.devices = ko.observableArray();
	this.deviceMap = {}
	this.initialized = ko.observable()

	this.updateDevice = function(deviceId, switchState) {
		if (self.deviceMap[deviceId]) {
			self.deviceMap[deviceId].switchState(switchState)
		} else {
			log.console(`Device ${deviceId} not found`)
		}
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

	this.allOn = function() {
		self.setSwitch('on')
	}

	this.allOff = function() {
		self.setSwitch('off')
	}

	this.setSwitch = function(value) {
		const params = {
			commands: [
				{
					componentId: 'main',
					capability: 'switch',
					command: value,
					argumemnts: []
				}
			]
		};

		$.ajax({
			type: "POST",
			url: `/commands`,
			data: JSON.stringify(params),
			dataType: 'json',
			contentType: "application/json; charset=utf-8",
			success: function (data) {
				//self.switchState(newValue);
			}
		});
	}
};
