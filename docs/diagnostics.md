# Experimental cooperative diagnostics (Phase 1)

This additive SDK API supports [SNOW-1370](https://zendesk.atlassian.net/browse/SNOW-1370).
It requires the host's opt-in, bounded `window.ZendeskApps.Diagnostics` capture implementation.
It does not start captures, collect continuously, store snapshots, or upload data.
Existing apps need no changes; old hosts never start capture and ordinary calls emit no diagnostic observations.
The two event subscriptions are ordinary SDK subscriptions, including on old hosts.

## App API

`client.instrument(name, options?)` returns a synchronous boolean: `true` means an
observation was handed to the local postMessage transport, not accepted or persisted
by the host. `false` means disabled, not ready, invalid, expired, exhausted, or a
transport failure. It never creates a response promise or waits for an old host.

```js
// Call when useful app UI is actually ready; SDK handshake is not UI readiness.
client.instrument('app.ready')

const started = performance.now()
// Perform an app operation, then mark its measured duration:
client.instrument('app.operation', {
  durationMs: performance.now() - started,
  outcome: 'success',
  attributes: { count: 1 }
})
```

The host must have started capture before these calls. No observations queue before
registration. Instrumentation is cooperative evidence supplied by app code, not trusted
proof of behavior. Do not send user ID tags: app/installation/instance identity is
derived and validated by the host from the transport, never from arbitrary iframe tags.
No account/user identity belongs in Phase 1 observations.

## Shared wire protocol (schema 1.0)

Host control calls, verbatim:

```js
app.postMessage('diagnostics.start', { schemaVersion: '1.0', captureId, maxEvents, maxDurationMs })
app.postMessage('diagnostics.stop', { schemaVersion: '1.0', captureId })
```

The SDK consumes these using normal `client.on('diagnostics.start', handler)` and
`client.on('diagnostics.stop', handler)`. The existing incoming envelope is
`{key:'zaf.diagnostics.start', message:{...}, instanceGuid?}` (or stop).
The dispatcher strips `zaf.` only after checking exact configured host origin and
source window. Controls for an instance client route to that client. Sandbox and
origin checks are unchanged. These checks do not isolate code sharing this iframe.

SDK emission, verbatim:

```js
client.postMessage('diagnostics.instrument', payload)
// payload:
// {schemaVersion:'1.0', captureId:string, name:allowedName,
//  durationMs?:number, outcome?:allowedOutcome, attributes?:allowedAttributes}
```

The existing serialized outgoing envelope is
`{key:'diagnostics.instrument',message:payload,appGuid,instanceGuid}`.
There is no request ID, acknowledgement, raw timestamp, or new channel. Host event
routing adds its normal `iframe.` prefix when consuming SDK messages; the host
must handle `iframe.diagnostics.instrument`. Per-frame durations remain durations;
the host assigns capture-relative receipt timestamps.

Allowed names, exactly:

- `app.ready`, `app.operation`, `sdk.roundtrip`
- `iframe.error`, `iframe.unhandledrejection`, `iframe.resource`, `iframe.click`
- `iframe.longtask`, `iframe.long-animation-frame`

Allowed outcomes: `success`, `error`, `timeout`, `cancelled`, `unknown`.
Allowed attributes only:

- Finite nonnegative numbers: `count`, `durationMs`, `transferSize`, `encodedBodySize`, `decodedBodySize`.
- Boolean: `hidden`.
- `operation`: `get`, `set`, `invoke`, `request`.
- `initiatorType`: `fetch`, `xmlhttprequest`, `script`, `css`, `img`, `other`.

All numeric values (including top-level duration) are bounded to 1,000,000,000.
Unknown keys/attributes are dropped, as on the host. Invalid known values or names
reject the entire observation; no coercion. Options and attributes must be non-array
objects. No arbitrary tags, text, errors/stacks, URLs, bodies, DOM/input values,
credentials, settings or app/account/user identity are transmitted in the payload.

## Lifecycle and volume bounds

Each client has its own controller. Start requires registration, schema `1.0`, a
nonempty capture ID of at most 128 characters, and finite positive limits (at most
1,000,000,000). Event limits are floored. The effective limits are the stricter of
the host values and **500 events / 60 seconds**. Duplicate starts for the most recent
capture ID are ignored, even after stop; a different ID replaces the previous capture.
Use unique capture IDs. Invalid starts and mismatched stops have no effect. Stop,
deadline, budget exhaustion and pagehide remove listeners, disconnect observers,
and clear timers. There are no diagnostic browser observers outside a capture.
A send attempt consumes budget even if transport fails. There is no retry queue.

Errors, unhandled rejections and clicks are scalar counts flushed at most once per
second per type. Final partial counts are discarded at stop (no post-stop emission).
Resources are limited to 20 per second; observer batches process at most 20 entries
per type, in addition to the total event cap. Excess data is discarded, never queued.
The host's dropped-event count cannot include SDK-side discarded observations;
a sparse capture is not proof of inactivity. A busy frame's timer can fire late,
but every send also checks the deadline. Diagnostic overhead is bounded, not zero.

Get/set/invoke emit one `sdk.roundtrip` only when the operation starts and settles
in the same capture. Resolved nonempty per-path `errors` maps count as `error`, as do
rejections; otherwise outcome is `success`. Existing singular-operation rejection,
bulk results, promise/error behavior and timeout tracking remain unchanged. Diagnostic
spans do not begin before readiness. The existing SDK timeout is 300 seconds,
longer than a capture: such pending calls normally produce no SDK completion span.
Timeout classification exists for timeouts settling during capture; use host spans
to diagnose pending requests. No diagnostic request promise is introduced.
`request` is an allowed custom operation value; automatic request attempt/retry/queue
measurement belongs to the host. No fetch/XHR monkeypatching is performed.

## Capability matrix and interpretation

This is a feature-detection matrix, not a claim of validated support in every browser/version.

| Signal | Chromium | Firefox / Safari | Limits |
| --- | --- | --- | --- |
| App marks, ZAF roundtrips | Available with updated SDK/host | Available with updated SDK/host | Cooperative, wall-clock durations; not CPU |
| Error/rejection counts, clicks | Event APIs | Event APIs | After capture start only; no text, DOM, or replay |
| Navigation summary | Navigation Timing when available | Navigation Timing when available | One current navigation summary as `iframe.resource`, initiator `other`; no URL |
| Resources | PerformanceObserver resource support | Feature-detected | New entries only, numeric sizes/durations; Timing-Allow-Origin restrictions may yield zero sizes |
| Long Tasks | Feature-detected | Usually unavailable | Optional elapsed long-task entries, never CPU percentages |
| Long Animation Frames | Feature-detected | Usually unavailable | Optional elapsed frame entries, never CPU percentages |
| Per-app memory | Unsupported | Unsupported | Experimental browser memory APIs are not collected or a baseline |

Observer construction/observe failures are ignored. Absence of `PerformanceObserver`
or `supportedEntryTypes` disables those observations. No unsupported signal is
invented; the host snapshot's capabilities must mark memory unsupported and missing
browser signals unavailable. No extra capability messages are added to this protocol.

Early pre-SDK/pre-capture errors, nested frames, direct network bodies, opaque
cross-origin timing and pinned/old SDKs remain blind spots. Resource timing is
partial network evidence and may include cached resources. Click counts do not
reconstruct actions. Multiple client objects share this iframe's browser activity;
if the host captures several simultaneously, browser observations overlap and
must not be summed as distinct activity of remote instances. Host-derived identity
is still authoritative. Long-task/frame durations and overlapping SDK spans do
not establish CPU use or causality. Complete replay and guaranteed per-app CPU or
memory attribution remain unavailable.

## Snapshot ownership, testing and rollout

The host owns the shared snapshot, not the SDK:

```text
{schemaVersion:'1.0',captureId,mode:'on-demand'|'automated-test',
 environment:'real-host'|'mock',startedAt,durationMs,capabilities,
 limits:{maxEvents,maxBytes,maxDurationMs},droppedEvents,events,summary}

events: {eventId,parentId?,source:'host'|'sdk'|'browser',category,name,
 timestampMs,durationMs?,outcome?,appId?,installationId?,instanceId?,
 targetInstanceId?,location?,attributes?}
```

Recommended rollout order: host schema validation, bounded capture and kill switch
first; this optional SDK next; App Builder/manual test capture adapters after
cross-repo contract verification. Keep collection opt-in. Old SDKs retain host-only
coverage; updated SDKs on old hosts stay inactive. No contract change is required.

For a version-associated snapshot, load a known app version, start a bounded host
capture using `window.ZendeskApps.Diagnostics`, exercise readiness/operations and
known faults, stop and export through the host. Record app version, SDK/host version,
browser, scenario and real-host/mock environment alongside the host artifact using
the host/App Builder adapter. SDK payloads carry no version or identity tags. Compare
repeated fixed scenarios with capture off/on and app enabled/disabled. Mock snapshots
show app-local behavior; real Agent Workspace runs are required for host impact.

Manual integration checks after coordinated host review: reject foreign source/origin
controls; capture two installations and multiple instances; inspect exact envelopes;
exercise bulk per-path errors, high clicks/resources/errors, stop/restart and pagehide;
check Firefox/Safari fallbacks and compare repeated baseline/capture overhead. Local
Karma tests cover SDK wire dispatch and browser APIs with controlled fixtures; they
do not validate a deployed host, real app version association, or production overhead.
No deployment, publishing, upload/storage or Jira/Slack posting is part of this SDK change.
