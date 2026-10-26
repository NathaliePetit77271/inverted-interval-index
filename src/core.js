/**
 * A node in the AVL-balanced binary search tree keyed by interval start.
 *
 * Storing the subtree-maximum here lets every point-stabbing query prune the
 * whole right subtree when its left child cannot contain the point — without
 * it the search would visit every node on a pathological skewed build.
 */
class Node {
  /**
   * @param {number} lo  Inclusive lower bound of the interval.
   * @param {number} hi  Exclusive upper bound of the interval.
   * @param {unknown} value Payload attached to this interval.
   */
  constructor(lo, hi, value) {
    this.lo = lo;
    this.hi = hi;
    this.value = value;
    this.max = hi;       // largest hi in this subtree
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

/**
 * Inverted Interval Index — indexes non-overlapping, half-open [lo, hi)
 * intervals and answers point-stabbing queries ("which interval contains this
 * point?") in O(log n) expected and O(log n) worst-case time.
 *
 * Design choices:
 *
 * • Half-open intervals [lo, hi).  This makes adjacent intervals like [0,10)
 *   and [10,20) unambiguous: the point 10 belongs to the second one, never
 *   both, never neither.  The caller is responsible for picking bounds that
 *   express the membership rule they want.
 *
 * • Non-overlapping is enforced on insert.  Half-open adjacency is allowed.
 *   The first interval that touches an existing one is accepted; a second
 *   interval whose interior overlaps an existing interior raises.  This is a
 *   strict, simple rule — no priority or coalescing logic.
 *
 * • The tree is keyed by `lo` and augmented with subtree-max `hi`.  Search
 *   descends left whenever the left subtree's max > query; otherwise it checks
 *   the current node, otherwise it descends right.  Because the intervals are
 *   disjoint, at most one node can contain the query, so the search terminates
 *   in one root-to-leaf path.
 *
 * • AVL balance keeps the path length O(log n) regardless of insertion order.
 */
export class InvertedIntervalIndex {
  constructor() {
    this._root = null;
    this._size = 0;
  }

  /** Number of intervals currently indexed. */
  get size() {
    return this._size;
  }

  /**
   * Insert a half-open interval [lo, hi) with an associated value.
   *
   * @param {number} lo  Inclusive start. Must satisfy lo < hi.
   * @param {number} hi  Exclusive end. Must satisfy hi > lo.
   * @param {unknown} [value]  Payload returned by {@link query} for points in this interval. Defaults to `[lo, hi)`.
   * @returns {void}
   * @throws {RangeError} If lo is NaN, hi is NaN, lo >= hi, or the interval overlaps an existing one.
   */
  insert(lo, hi, value) {
    if (Number.isNaN(lo) || Number.isNaN(hi)) {
      throw new RangeError('bounds must be finite numbers');
    }
    if (!(lo < hi)) {
      throw new RangeError('requires lo < hi (half-open interval)');
    }
    if (value === undefined) {
      value = [lo, hi];
    }
    this._root = this._insert(this._root, lo, hi, value);
    this._size += 1;
  }

  /**
   * Query for the interval containing `point`.
   *
   * @param {number} point
   * @returns {unknown|null} The value attached to the containing interval, or `null` if none.
   * @throws {RangeError} If `point` is NaN.
   */
  query(point) {
    if (Number.isNaN(point)) {
      throw new RangeError('point must be a finite number');
    }
    const node = this._query(this._root, point);
    return node === null ? null : node.value;
  }

  /** Remove every interval. */
  clear() {
    this._root = null;
    this._size = 0;
  }

  // ---- internal: search ------------------------------------------------

  /**
   * Iterative point-stabbing search.
   *
   * Because intervals are disjoint there is at most one match, so we never
   * need to explore both subtrees fully: prune right when left might hold the
   * answer, then check self, then fall through to right.
   */
  _query(node, point) {
    while (node !== null) {
      if (node.left !== null && node.left.max > point) {
        // left subtree *might* contain point; descend into it.
        node = node.left;
        continue;
      }
      if (point >= node.lo && point < node.hi) {
        return node;
      }
      // Not in left, not here → only right can hold it (if anywhere).
      node = node.right;
    }
    return null;
  }

  // ---- internal: insert ------------------------------------------------

  _insert(node, lo, hi, value) {
    if (node === null) {
      return new Node(lo, hi, value);
    }
    // Non-overlap check (half-open adjacency is permitted).
    if (lo < node.hi && node.lo < hi) {
      throw new RangeError(
        `interval [${lo}, ${hi}) overlaps existing [${node.lo}, ${node.hi})`
      );
    }
    if (lo < node.lo) {
      node.left = this._insert(node.left, lo, hi, value);
    } else {
      node.right = this._insert(node.right, lo, hi, value);
    }
    this._update(node);
    return this._rebalance(node);
  }

  // ---- internal: AVL balance -------------------------------------------

  _height(node) {
    return node === null ? 0 : node.height;
  }

  _update(node) {
    node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
    node.max = node.hi;
    if (node.left !== null && node.left.max > node.max) {
      node.max = node.left.max;
    }
    if (node.right !== null && node.right.max > node.max) {
      node.max = node.right.max;
    }
  }

  _balanceFactor(node) {
    return node === null ? 0 : this._height(node.left) - this._height(node.right);
  }

  _rebalance(node) {
    const bf = this._balanceFactor(node);
    if (bf > 1) {
      if (this._balanceFactor(node.left) < 0) {
        node.left = this._rotateLeft(node.left);
      }
      return this._rotateRight(node);
    }
    if (bf < -1) {
      if (this._balanceFactor(node.right) > 0) {
        node.right = this._rotateRight(node.right);
      }
      return this._rotateLeft(node);
    }
    return node;
  }

  _rotateLeft(node) {
    const r = node.right;
    node.right = r.left;
    r.left = node;
    this._update(node);
    this._update(r);
    return r;
  }

  _rotateRight(node) {
    const l = node.left;
    node.left = l.right;
    l.right = node;
    this._update(node);
    this._update(l);
    return l;
  }
}
