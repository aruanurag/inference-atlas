import test from 'node:test';
import assert from 'node:assert/strict';
import { isCompatible, readState, visibleToolState, writeState } from '../src/state.js';

const gpuTool = { supportedHardware: ['gpu'] };
const sharedTool = { supportedHardware: ['gpu', 'cpu'] };

test('readState uses GPU mode when the query is missing or invalid', () => {
  assert.deepEqual(readState(''), { mode: 'gpu', toolId: null, layerId: null, memoryId: null });
  assert.equal(readState('?mode=tpu').mode, 'gpu');
  assert.deepEqual(readState('?mode=cpu&tool=llama-cpp&layer=runtime'), {
    mode: 'cpu',
    toolId: 'llama-cpp',
    layerId: 'runtime',
    memoryId: null,
  });
});

test('writeState creates a shareable relative URL and clears absent selection values', () => {
  assert.equal(
    writeState({ mode: 'cpu', toolId: 'llama-cpp', layerId: 'runtime', memoryId: 'cpu-dram' }, 'https://atlas.example/?mode=gpu'),
    '/?mode=cpu&tool=llama-cpp&layer=runtime&memory=cpu-dram',
  );
  assert.equal(
    writeState({ mode: 'gpu', toolId: null, layerId: null, memoryId: null }, 'https://atlas.example/path?tool=vllm&memory=gpu-hbm'),
    '/path?mode=gpu',
  );
});

test('mode compatibility produces active and muted visual states', () => {
  assert.equal(isCompatible(gpuTool, 'gpu'), true);
  assert.equal(isCompatible(gpuTool, 'cpu'), false);
  assert.equal(isCompatible(sharedTool, 'cpu'), true);
  assert.equal(visibleToolState(gpuTool, 'cpu'), 'muted');
  assert.equal(visibleToolState(sharedTool, 'cpu'), 'active');
});
