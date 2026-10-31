import test from 'node:test';
import assert from 'node:assert/strict';
import { planFrameTimes } from './videoFrames';

test('fps, interval, and total plans use finite positions within duration', () => {
  assert.deepEqual(planFrameTimes(2, {strategy:'fps', value:2}), [0,0.5,1,1.5]);
  assert.deepEqual(planFrameTimes(2, {strategy:'interval', value:0.75}), [0,0.75,1.5]);
  assert.deepEqual(planFrameTimes(2, {strategy:'total', value:2}), [0,1]);
});

test('invalid durations, parameters, and excessive plans fail explicitly', () => {
  assert.throws(() => planFrameTimes(Infinity, {strategy:'fps', value:1}), /时长无效/);
  assert.throws(() => planFrameTimes(0, {strategy:'fps', value:1}), /时长无效/);
  assert.throws(() => planFrameTimes(2, {strategy:'total', value:1.5}), /整数/);
  assert.throws(() => planFrameTimes(100, {strategy:'fps', value:10}), /超过上限/);
  assert.throws(() => planFrameTimes(2, {strategy:'total', value:2, maxFrames:301}), /1 至 300/);
});
