// A failed gossip discovery is cached forever by @kurrent/kurrentdb-client 1.3.2.
//
// The "seed" below accepts TCP connections and drops them, which stands in for a
// cluster with no usable node and lets us count discovery attempts. No KurrentDB
// server is needed.
const { createServer } = require('node:net');
const { KurrentDBClient, jsonEvent } = require('@kurrent/kurrentdb-client');

(async () => {
  let connections = 0;
  const seed = createServer((socket) => {
    connections++;
    socket.destroy();
  });
  await new Promise((resolve) => seed.listen(0, '127.0.0.1', resolve));

  const client = KurrentDBClient.connectionString(
    `kurrentdb+discover://127.0.0.1:${seed.address().port}?tls=false&maxDiscoverAttempts=2&discoveryInterval=10&gossipTimeout=1`
  );
  const append = () =>
    client
      .appendToStream('stream', jsonEvent({ type: 'test', data: {} }))
      .catch((error) => error.message);

  const first = await append();
  const afterFirst = connections;
  const second = await append();
  const afterSecond = connections;

  console.log(`1st append: "${first}" (gossip connections so far: ${afterFirst})`);
  console.log(`2nd append: "${second}" (gossip connections so far: ${afterSecond})`);
  console.log(
    afterSecond > afterFirst
      ? 'OK: the second append ran discovery again.'
      : 'BUG: the second append made no discovery attempt; it rethrew the cached failure.'
  );

  await client.dispose();
  seed.close();
  process.exitCode = afterSecond > afterFirst ? 0 : 1;
})();
