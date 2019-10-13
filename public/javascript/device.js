const Device = function (parent, device) {
	const self = this;

	this.parent = parent;
	this.deviceId = device.deviceId;
	this.label = device.label;
	this.switchState = ko.observable(device.switchState || '--');
	this.tileActive = ko.observable(false);

	this.tileState = ko.pureComputed(function() {
		return `${self.tileActive() ? 'processing ' : ''}${self.switchState()}`;
	});

	this.toggleState = function () {
		self.tileActive(true);
		const newValue = self.switchState() === 'on' ? 'off' : 'on'
		const params = {
			commands: [
				{
					componentId: 'main',
					capability: 'switch',
					command: newValue,
					argumemnts: []
				}
			]
		};

		$.ajax({
			type: "POST",
			url: `/command/${self.deviceId}`,
			data: JSON.stringify(params),
			dataType: 'json',
			contentType: "application/json; charset=utf-8",
			success: function (data) {
				//self.switchState(newValue);
			}
		});
	}

	this.switchState.subscribe(function() {
		self.tileActive(false);
	})
};
