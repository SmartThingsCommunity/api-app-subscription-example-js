let viewModel
let eventSource
$( document ).ready(function() {
	viewModel = new ViewModel();
	ko.applyBindings(viewModel);
	$.get('/viewData', function(viewData) {
		console.log(`viewData=${JSON.stringify(viewData,null,2)}`)
		viewModel.initialize(viewData);

		console.log('Opening SSE connection')
		eventSource = new EventSource('/events');
		eventSource.onmessage = function (event) {
			const data = JSON.parse(event.data)
			console.log(JSON.stringify(data))
			if (data.deviceId) {
				viewModel.updateDevice(data.deviceId, data.switchState)
			}
		};
		eventSource.onerror = function(error) {
			console.log('EventSource failed %j', error);
		};
	});
});
