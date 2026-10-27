# inverted-interval-index

Indexes non-overlapping numeric intervals for point-stabbing queries returning the containing interval in logarithmic time.

## Usage

```js
import { InvertedIntervalIndex } from 'inverted-interval-index';

const idx = new InvertedIntervalIndex();
idx.insert(0, 10, 'low');
idx.insert(10, 20, 'mid');
idx.insert(20, 30, 'high');

idx.query(5);   // 'low'   — 5 is in [0, 10)
idx.query(10);  // 'mid'   — 10 is in [10, 20), not in [0, 10)
idx.query(15);  // 'mid'
idx.query(25);  // 'high'
idx.query(30);  // null    — 30 is past the last interval
idx.query(-1);  // null
```

The value argument is optional; if omitted, `query` returns `[lo, hi]`.

## Why

When you have a large, fixed set of disjoint numeric ranges and need to answer
"which range contains this value?" repeatedly, a linear scan is O(n) per query.
This library stores the ranges in an AVL-balanced search tree keyed by the
interval's lower bound and augmented with the maximum upper bound in each
subtree. A point query descends a single root-to-leaf path, giving O(log n)
worst-case lookup after any insertion order.

The trade-off: intervals must be non-overlapping, and there is no deletion.
This suits a build-once-query-many workload (routing tables, version ranges,
histogram buckets) rather than a mutable, heavily edited set.

## Edge cases

Intervals are half-open `[lo, hi)`. The point `lo` is inside the interval; the
point `hi` is not. This makes adjacent intervals like `[0, 10)` and `[10, 20)`
unambiguous — `10` belongs to the second one. If you need closed intervals,
shift your bounds by one in the `hi` direction and account for it at call
sites.

A second interval that overlaps the interior of an existing one raises
`RangeError` on insert. Half-open adjacency (e.g. `[0,10)` then `[10,20)`) is
allowed and does not raise.

NaN bounds and NaN query points are rejected with `RangeError`.
