import test from 'node:test';
import assert from 'node:assert/strict';
import { layers, tools } from '../src/catalog.js';

test('catalog contains the reviewed 69 unique, complete entries', () => {
  assert.equal(tools.length, 69);
  assert.equal(new Set(tools.map((tool) => tool.id)).size, 69);

  for (const tool of tools) {
    assert.ok(tool.id);
    assert.ok(tool.name);
    assert.ok(tool.type);
    assert.ok(layers.some((layer) => layer.id === tool.primaryLayer));
    assert.ok(tool.supportedHardware.length > 0);
    assert.ok(tool.description);
    assert.ok(tool.chooseWhen);
    assert.ok(Array.isArray(tool.relationships));
    assert.doesNotThrow(() => new URL(tool.officialUrl));
    assert.match(tool.lastReviewed, /^\d{4}-\d{2}-\d{2}$/);
  }

  for (const layer of layers) {
    assert.doesNotThrow(() => new URL(layer.readMoreUrl));
    assert.ok(layer.readMoreLabel);
    assert.equal(layer.guide.length, 3);
    assert.ok(layer.guide.every(Boolean));
  }
});

test('catalog separates GPU-only engines from CPU-capable local runtimes', () => {
  const byId = new Map(tools.map((tool) => [tool.id, tool]));
  assert.deepEqual(byId.get('vllm').supportedHardware, ['gpu']);
  assert.deepEqual(byId.get('sglang').supportedHardware, ['gpu']);
  assert.ok(byId.get('llama-cpp').supportedHardware.includes('cpu'));
  assert.ok(byId.get('openvino-genai').supportedHardware.includes('cpu'));
  assert.equal(byId.get('tgi').status, 'archived');
});
