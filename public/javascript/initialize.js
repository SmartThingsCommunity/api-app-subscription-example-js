let viewModel
let eventSource
$( document ).ready(function() {
	$.get('/viewData', function(viewData) {
		console.log(`viewData=${JSON.stringify(viewData,null,2)}`)
		viewModel = new ViewModel(viewData);
		ko.applyBindings(viewModel);

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
