// Client-side chat logic: listen to server-sent events and send messages
window.messages = document.getElementById('messages');
window.form = document.getElementById('form');
window.input = document.getElementById('input');

// Listen for server-sent events
if (window.EventSource) {
	const es = new window.EventSource('/sse');
	es.onmessage = function (event) {
		const p = document.createElement('p');
		p.textContent = event.data;
		window.messages.appendChild(p);
	};
}

// Send messages via GET /chat?message=...
if (window.form) {
	window.form.addEventListener('submit', function (ev) {
		ev.preventDefault();
		const msg = window.input && window.input.value;
		if (!msg) return;
		window.fetch('/chat?message=' + encodeURIComponent(msg));
		window.input.value = '';
	});
}
