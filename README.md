# @kurrent/kurrentdb-client: a failed discovery is cached forever

Once gossip discovery runs out of attempts while the client is fetching server
capabilities, every later `appendToStream` (and any other call that checks
capabilities) rejects with the same `Failed to discover after N attempts.` and
makes no network request. The client never recovers, even after the cluster is
healthy; only a new client does.

## Run

```
npm install
npm start
```

No KurrentDB server is needed. A local TCP listener that accepts and drops
connections stands in for a seed with no usable node, and counts discovery
attempts.

## Output on 1.3.2

```
1st append: "Failed to discover after 2 attempts." (gossip connections so far: 2)
2nd append: "Failed to discover after 2 attempts." (gossip connections so far: 2)
BUG: the second append made no discovery attempt; it rethrew the cached failure.
```

Expected: the second append runs discovery again, so the connection count rises.

## Cause

`Client.capabilities` caches the promise returned by `execute(...)`. When
discovery throws inside it, the rejected promise stays in `#serverFeatures`,
and `supports()` rethrows it on every later call.
