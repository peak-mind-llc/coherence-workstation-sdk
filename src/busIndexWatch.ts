/**
 * Bus index-watch coordinator.
 *
 * ONE per session. While a warm runs it polls GET /api/bus/{session}/index and
 * calls client.invalidate() whenever the set of artifact types changes, so every
 * useBusArtifact subscriber re-fetches once against the fresh index — replacing
 * the per-pane 404 blind-poll that used to catch late-landing artifacts. When the
 * index stops changing (SETTLE_STABLE_POLLS unchanged polls) or a backstop cap
 * (WATCH_MAX_MS) elapses, it publishes settled=true and stops: steady-state bus
 * traffic drops to zero. See
 * docs/superpowers/plans/2026-07-18-bus-404-poll-storm-elimination.md.
 */
import { getBusClient, setBusIndex } from './bus';

const INDEX_POLL_MS = 2000;
// ~60s of index quiescence at INDEX_POLL_MS. Must comfortably exceed the longest
// single-producer gap in a warm (source-localize / normative ICA fit / the
// second-condition sweep, each 10-60s on a background thread) — a shorter window
// would settle mid-warm and stop polling, stranding a slow late-landing artifact
// in its 'missing' empty state until a manual reload (WOR-164 final review). The
// 8-min WATCH_MAX_MS backstop still caps a pathologically long / stuck warm.
const SETTLE_STABLE_POLLS = 30;
const WATCH_MAX_MS = 8 * 60 * 1000;

let _timer: ReturnType<typeof setTimeout> | null = null;
let _prev: Set<string> | null = null;
let _stable = 0;
let _startedAt = 0;
let _epoch = 0;

function sameSet(a: Set<string>, b: Set<string> | null): boolean {
  if (!b || a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function stopTimer(): void {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}

function scheduleNext(delayMs: number): void {
  stopTimer();
  _timer = setTimeout(() => void poll(), delayMs);
}

async function poll(): Promise<void> {
  const client = getBusClient();
  if (!client || typeof client.fetchIndex !== 'function') {
    disarmBusIndexWatch();
    return;
  }
  const myEpoch = _epoch;

  let snapshot: Set<string>;
  try {
    snapshot = await client.fetchIndex();
  } catch {
    // A poll from a superseded arm/disarm cycle must not touch shared state.
    if (myEpoch !== _epoch) return;
    // Transient (backend mid-restart): keep the last snapshot and retry — but
    // still honor the backstop so a permanently-down index eventually settles
    // and stops instead of polling forever.
    if (Date.now() - _startedAt >= WATCH_MAX_MS) {
      setBusIndex(_prev, true);
      stopTimer();
      return;
    }
    scheduleNext(INDEX_POLL_MS);
    return;
  }

  // Superseded by a re-arm or disarm while awaiting — drop this stale result.
  if (myEpoch !== _epoch) return;

  const changed = !sameSet(snapshot, _prev);
  _prev = snapshot;
  _stable = changed ? 0 : _stable + 1;

  const expired = Date.now() - _startedAt >= WATCH_MAX_MS;
  const settled = _stable >= SETTLE_STABLE_POLLS || expired;

  setBusIndex(snapshot, settled);
  if (changed) {
    const inv = (client as { invalidate?: () => void }).invalidate;
    if (typeof inv === 'function') inv();
  }

  if (settled) {
    stopTimer();
    return;
  }
  scheduleNext(INDEX_POLL_MS);
}

/** (Re)start the watch: a warm was just dispatched, new artifacts are imminent. */
export function armBusIndexWatch(): void {
  const client = getBusClient();
  if (!client || typeof client.fetchIndex !== 'function') return;
  _epoch += 1; // invalidate any poll still in flight from a prior arm cycle
  _prev = null; // force the first poll to count as a change (fresh warm)
  _stable = 0;
  _startedAt = Date.now();
  setBusIndex(null, false); // warm active; index not yet re-read → hooks fetch
  scheduleNext(0);
}

/** Stop the watch (session teardown). Return to at-rest: index unknown, settled. */
export function disarmBusIndexWatch(): void {
  _epoch += 1; // invalidate any poll still in flight
  stopTimer();
  _prev = null;
  _stable = 0;
  setBusIndex(null, true);
}
