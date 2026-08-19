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
import { getBusClient, setBusIndex, type BusIndexSnapshot } from './bus';

const INDEX_POLL_MS = 2000;
// ~60s of index quiescence at INDEX_POLL_MS. This is the FALLBACK settle rule,
// used only when the backend doesn't report warm state (`warming: null`) — a
// fixture server, or a backend predating the flag. When the backend does report,
// quiescence alone is never enough: the warm must also be finished.
//
// Quiescence alone was wrong. SEGA__2026-08-18's normative step left the index
// unchanged for 112s in the middle of a live warm; the watch declared the warm
// over at 60s and stopped polling, so hrv.report and everything after it landed
// unobserved and every consuming pane sat on a false "no data" state until the
// clinician hit Cmd-R. The producer gaps this window was sized against ("each
// 10-60s") were simply an underestimate, and no constant is safe against the
// next slower machine — hence the authoritative signal.
const SETTLE_STABLE_POLLS = 30;
// No-PROGRESS backstop, not an absolute deadline: the clock resets whenever the
// index changes or the backend reports an active warm. A warm that legitimately
// runs 20 minutes stays watched; a genuinely stuck/dead backend still settles
// and stops polling after 8 idle minutes.
const WATCH_MAX_MS = 8 * 60 * 1000;

let _timer: ReturnType<typeof setTimeout> | null = null;
let _prev: Set<string> | null = null;
let _stable = 0;
/** Timestamp of the last observed progress (index change or reported warm). */
let _lastProgressAt = 0;
let _epoch = 0;

function sameSet(a: Set<string>, b: Set<string> | null): boolean {
  if (!b || a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/** Accept both the current snapshot shape and the legacy bare-Set contract. */
function normalizeSnapshot(raw: BusIndexSnapshot | Set<string>): BusIndexSnapshot {
  return raw instanceof Set ? { types: raw, warming: null } : raw;
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

  let snapshot: BusIndexSnapshot;
  try {
    snapshot = normalizeSnapshot(await client.fetchIndex());
  } catch {
    // A poll from a superseded arm/disarm cycle must not touch shared state.
    if (myEpoch !== _epoch) return;
    // Transient (backend mid-restart): keep the last snapshot and retry — but
    // still honor the backstop so a permanently-down index eventually settles
    // and stops instead of polling forever.
    if (Date.now() - _lastProgressAt >= WATCH_MAX_MS) {
      setBusIndex(_prev, true);
      stopTimer();
      return;
    }
    scheduleNext(INDEX_POLL_MS);
    return;
  }

  // Superseded by a re-arm or disarm while awaiting — drop this stale result.
  if (myEpoch !== _epoch) return;

  const changed = !sameSet(snapshot.types, _prev);
  _prev = snapshot.types;
  _stable = changed ? 0 : _stable + 1;

  // Progress = the index grew, or the backend says it's still producing. Either
  // way, more artifacts are expected, so the no-progress backstop restarts.
  if (changed || snapshot.warming === true) _lastProgressAt = Date.now();

  const expired = Date.now() - _lastProgressAt >= WATCH_MAX_MS;
  // A reported-active warm blocks settling outright: quiescence during a warm
  // means a slow producer, not a finished chain. When the backend says nothing
  // (`null`), quiescence is all we have, so it governs as it always did.
  const quiet = _stable >= SETTLE_STABLE_POLLS && snapshot.warming !== true;
  const settled = quiet || expired;

  setBusIndex(snapshot.types, settled);
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
  _lastProgressAt = Date.now();
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
