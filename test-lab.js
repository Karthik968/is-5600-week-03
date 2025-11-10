const http = require('http');

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 3000, path, agent: false }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

function sseOnce(path, sendSignal) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path, headers: { Accept: 'text/event-stream' } }, (res) => {
      res.setEncoding('utf8');
      let buffer = '';

      const onData = (chunk) => {
        buffer += chunk;
        const parts = buffer.split('\n\n');
        if (parts.length > 1 && parts[0].startsWith('data:')) {
          const line = parts[0].replace(/^data:\s*/, '');
          cleanup();
          resolve(line.trim());
        }
      };

      const cleanup = () => {
        res.removeListener('data', onData);
        req.destroy();
      };

      res.on('data', onData);
      res.on('end', () => reject(new Error('SSE ended before message')));
    });

    req.on('error', reject);
    req.end();

    if (typeof sendSignal === 'function') sendSignal();
  });
}

async function run() {
  console.log('Checking /json...');
  const json = await getJson('/json');
  console.log('status:', json.status);
  console.log('body:', JSON.stringify(json.body));

  console.log('\nChecking /echo?input=fullstack...');
  const echo = await getJson('/echo?input=fullstack');
  console.log('status:', echo.status);
  console.log('body:', JSON.stringify(echo.body));

  console.log('\nChecking SSE + /chat flow...');

  const ssePromise = sseOnce('/sse', () => {
    setTimeout(() => {
      http.get({ hostname: 'localhost', port: 3000, path: '/chat?message=test-from-automated', agent: false }, () => {} ).on('error', () => {});
    }, 150);
  });

  try {
    const msg = await Promise.race([ssePromise, new Promise((_, r) => setTimeout(() => r(new Error('timeout waiting for sse')), 3000))]);
    console.log('SSE received:', msg);
    console.log('\nAll checks passed');
    process.exit(0);
  } catch (err) {
    console.error('SSE check failed:', err && err.message);
    process.exit(2);
  }
}

run().catch((err) => {
  console.error('Test script error:', err && err.stack);
  process.exit(3);
});
