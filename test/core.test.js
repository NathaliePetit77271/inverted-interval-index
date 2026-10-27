import { test } from 'node:test';
import assert from 'node:assert/strict';

import { InvertedIntervalIndex } from '../src/index.js';

test('query returns null on an empty index', () => {
  const idx = new InvertedIntervalIndex();
  assert.equal(idx.query(5), null);
  assert.equal(idx.size, 0);
});

test('insert and query a single interval', () => {
  const idx = new InvertedIntervalIndex();
  idx.insert(10, 20, 'A');
  assert.equal(idx.query(10), 'A');
  assert.equal(idx.query(19), 'A');
  assert.equal(idx.query(20), null);
  assert.equal(idx.query(9), null);
  assert.equal(idx.size, 1);
});

test('insert without value defaults to [lo, hi]', () => {
  const idx = new InvertedIntervalIndex();
  idx.insert(0, 5);
  assert.deepEqual(idx.query(3), [0, 5]);
});

test('query handles negative bounds', () => {
  const idx = new InvertedIntervalIndex();
  idx.insert(-20, -10, 'neg');
  assert.equal(idx.query(-20), 'neg');
  assert.equal(idx.query(-15), 'neg');
  assert.equal(idx.query(-10), null);
  assert.equal(idx.query(0), null);
});

test('adjacent half-open intervals do not overlap and point at the boundary goes to the later one', () => {
  const idx = new InvertedIntervalIndex();
  idx.insert(0, 10, 'A');
  idx.insert(10, 20, 'B');
  assert.equal(idx.query(9), 'A');
  assert.equal(idx.query(10), 'B');
  assert.equal(idx.query(19), 'B');
  assert.equal(idx.query(20), null);
  assert.equal(idx.size, 2);
});

test('overlapping intervals throw RangeError', () => {
  const idx = new InvertedIntervalIndex();
  idx.insert(0, 10, 'A');
  assert.throws(() => idx.insert(5, 15, 'B'), RangeError);
  assert.equal(idx.size, 1);
});

test('inserted-in-reverse-order builds a valid balanced tree', () => {
  const idx = new InvertedIntervalIndex();
  for (let i = 9; i >= 0; i--) {
    idx.insert(i * 10, i * 10 + 5, `n${i}`);
  }
  assert.equal(idx.size, 10);
  for (let i = 0; i < 10; i++) {
    assert.equal(idx.query(i * 10), `n${i}`);
    assert.equal(idx.query(i * 10 + 4), `n${i}`);
    assert.equal(idx.query(i * 10 + 5), null);
  }
});

test('interleaved gaps and intervals across negative and positive', () => {
  const idx = new InvertedIntervalIndex();
  idx.insert(-100, -50, 'neg');
  idx.insert(-10, 10, 'mid');
  idx.insert(50, 100, 'pos');
  assert.equal(idx.query(-100), 'neg');
  assert.equal(idx.query(-75), 'neg');
  assert.equal(idx.query(-50), null);
  assert.equal(idx.query(-10), 'mid');
  assert.equal(idx.query(0), 'mid');
  assert.equal(idx.query(9), 'mid');
  assert.equal(idx.query(10), null);
  assert.equal(idx.query(49), null);
  assert.equal(idx.query(50), 'pos');
  assert.equal(idx.query(99), 'pos');
  assert.equal(idx.query(100), null);
});

test('single-point intervals [n, n+1) work', () => {
  const idx = new InvertedIntervalIndex();
  idx.insert(5, 6, 'pt5');
  idx.insert(7, 8, 'pt7');
  assert.equal(idx.query(5), 'pt5');
  assert.equal(idx.query(6), null);
  assert.equal(idx.query(7), 'pt7');
  assert.equal(idx.query(8), null);
});

test('zero-length and inverted intervals are rejected', () => {
  const idx = new InvertedIntervalIndex();
  assert.throws(() => idx.insert(5, 5, 'x'), RangeError);
  assert.throws(() => idx.insert(10, 5, 'x'), RangeError);
  assert.equal(idx.size, 0);
});

test('NaN bounds and NaN point are rejected', () => {
  const idx = new InvertedIntervalIndex();
  assert.throws(() => idx.insert(NaN, 10, 'x'), RangeError);
  assert.throws(() => idx.insert(0, NaN, 'x'), RangeError);
  assert.throws(() => idx.query(NaN), RangeError);
});

test('clear empties the index', () => {
  const idx = new InvertedIntervalIndex();
  idx.insert(0, 10, 'A');
  idx.insert(20, 30, 'B');
  idx.clear();
  assert.equal(idx.size, 0);
  assert.equal(idx.query(5), null);
  assert.equal(idx.query(25), null);
});

test('large sequential insertion stays performant and correct', () => {
  const idx = new InvertedIntervalIndex();
  const n = 1000;
  for (let i = 0; i < n; i++) {
    idx.insert(i * 10, i * 10 + 8, i);
  }
  assert.equal(idx.size, n);
  for (let i = 0; i < n; i++) {
    assert.equal(idx.query(i * 10), i);
    assert.equal(idx.query(i * 10 + 7), i);
    assert.equal(idx.query(i * 10 + 8), null);
    assert.equal(idx.query(i * 10 + 9), null);
  }
});
