import test from 'node:test';
import assert from 'node:assert/strict';
import { imageTaskSeeds, videoTaskSeeds, datasetSeeds, exportHistorySeeds, imageFileSeeds, videoFileSeeds, annotationSeeds } from '../src/lib/annotationSeeds';

test('original annotation demo catalog retains all linked records and identifiers', () => {
  assert.deepEqual(imageTaskSeeds.map(item => item.id), ['IMG-TASK-001', 'IMG-TASK-002', 'IMG-TASK-003']);
  assert.deepEqual(videoTaskSeeds.map(item => item.id), ['VID-TASK-001', 'VID-TASK-002']);
  assert.deepEqual(datasetSeeds.map(item => item.id), ['DS-001', 'DS-002', 'DS-003', 'DS-004']);
  assert.deepEqual(exportHistorySeeds.map(item => item.id), ['EXP-001', 'EXP-002']);
  assert.equal(imageFileSeeds.length, 11);
  assert.equal(videoFileSeeds.length, 5);
  assert.equal(Object.keys(annotationSeeds).length, 9);
  assert.ok(imageFileSeeds.every(file => imageTaskSeeds.some(task => task.id === file.taskId)));
  assert.ok(videoFileSeeds.every(file => videoTaskSeeds.some(task => task.id === file.taskId)));
  assert.ok(datasetSeeds.every(dataset => dataset.taskIds.every(id => [...imageTaskSeeds, ...videoTaskSeeds].some(task => task.id === id))));
  assert.ok([...imageTaskSeeds, ...videoTaskSeeds, ...datasetSeeds, ...imageFileSeeds, ...videoFileSeeds, ...exportHistorySeeds].every(item => item.demo));
});
