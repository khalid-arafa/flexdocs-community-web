// Pure helpers for folding realtime socket events (`{add, update, delete}`)
// into a list already held in React state. Used by DocumentsBox (keyed by
// `_id`) and CollectionsBox (keyed by `name`) so the merge/dedupe rules for
// "server pushed something while the list was already loaded" live in one
// place instead of two near-identical copies that could quietly drift apart.
//
// All three functions return a brand new array and never mutate `list` or
// the incoming event items, so callers can pass the result straight to a
// `setState` updater.

/**
 * Upserts `added` items into `list` by `keyField`.
 *
 * Built via `new Map([...list, ...added].map(...))` rather than a manual
 * loop for a reason that matters to callers: Map assigns an entry's
 * iteration position the first time its key is set, and a later `set()` on
 * the same key only replaces the value, not the position. So when a pushed
 * item's key collides with one already in `list` (the server re-sends an
 * "add" the client already applied, or add/update events race), the newer
 * copy wins but the row stays put at its original index instead of jumping
 * to the end of the list.
 */
export function mergeAdd(list, added, keyField = "_id") {
  return Array.from(
    new Map([...list, ...added].map((item) => [item[keyField], { ...item }])).values()
  );
}

/**
 * Applies `updated` items onto `list` by `keyField`, shallow-merging each
 * match's fields onto the existing item.
 *
 * Unlike mergeAdd this is NOT an upsert: an entry in `updated` whose key
 * isn't already in `list` is silently dropped rather than inserted. Update
 * events are only ever emitted for documents the client is already watching,
 * so a non-match here means the row was removed (or paginated out) locally
 * before the event arrived, and there is nothing sensible to update.
 */
export function mergeUpdate(list, updated, keyField = "_id") {
  return list.map((item) => {
    const match = updated.find((u) => u[keyField] === item[keyField]);
    return match ? { ...item, ...match } : item;
  });
}

/** Removes every item of `list` whose `keyField` value appears in `deleted`. */
export function mergeDelete(list, deleted, keyField = "_id") {
  return list.filter((item) => !deleted.some((d) => d[keyField] === item[keyField]));
}
