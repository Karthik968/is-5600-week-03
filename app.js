const express = require('express');
const path = require('path');
const EventEmitter = require('events');

const port = process.env.PORT || 3000;

const app = express();

// serve static assets from /public
app.use(express.static(path.join(__dirname, 'public')));

const chatEmitter = new EventEmitter();

/** Responds with plain text */
function respondText(req, res) {
	res.setHeader('Content-Type', 'text/plain');
	res.end('hi');
}

/** Responds with JSON */
function respondJson(req, res) {
	res.json({ text: 'hi', numbers: [1, 2, 3] });
}

/** Responds with a 404 not found */
function respondNotFound(req, res) {
	res.status(404).type('text').send('Not Found');
}

/** Responds with the input string in various formats */
function respondEcho(req, res) {
	const input = req.query.input || '';
	res.json({
		normal: input,
		shouty: input.toUpperCase(),
		charCount: input.length,
		backwards: input.split('').reverse().join(''),
	});
}

/** Serves chat.html */
function chatApp(req, res) {
	res.sendFile(path.join(__dirname, 'chat.html'));
}

/** Receives a chat message and emits it */
function respondChat(req, res) {
	const message = req.query.message || '';
	if (message) chatEmitter.emit('message', message);
	res.end();
}

/** Server-Sent Events */
function respondSSE(req, res) {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		Connection: 'keep-alive',
		'Cache-Control': 'no-cache',
	});

	const onMessage = (message) => res.write(`data: ${message}\n\n`);
	chatEmitter.on('message', onMessage);

	req.on('close', () => {
		chatEmitter.off('message', onMessage);
	});
}

// routes
app.get('/', chatApp);
app.get('/text', respondText);
app.get('/json', respondJson);
app.get('/echo', respondEcho);
app.get('/chat', respondChat);
app.get('/sse', respondSSE);

// fallback
app.use((req, res) => respondNotFound(req, res));

app.listen(port, () => console.log(`Listening on port ${port}`));
