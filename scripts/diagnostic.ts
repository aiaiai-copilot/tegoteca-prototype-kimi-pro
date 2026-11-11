import { cpus, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { generateDiagnosticWorkspace, DIAGNOSTIC_SEED } from '../src/model/diagnostic';
import { selectElements } from '../src/model/elements';
import { getAutocomplete, getTransitions } from '../src/model/navigation';
import { nodeKey } from '../src/model/tags';
import type { Workspace } from '../src/types';

const ITERATIONS = 9;

interface Measurement {
  resultCount: number;
  samplesMs: number[];
  medianMs: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
}

function measure(operation: () => readonly unknown[]): Measurement {
  operation();
  const samplesMs: number[] = [];
  let resultCount = 0;
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const startedAt = performance.now();
    const result = operation();
    samplesMs.push(performance.now() - startedAt);
    resultCount = result.length;
  }
  const sorted = [...samplesMs].sort((a, b) => a - b);
  return {
    resultCount,
    samplesMs,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    meanMs: samplesMs.reduce((sum, value) => sum + value, 0) / samplesMs.length,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
  };
}

function findUnfilledNode(workspace: Workspace): string[] {
  const filledSubsets = new Set<string>();
  for (const element of workspace.elements) {
    const tagIds = element.tagIds ?? [];
    for (let mask = 1; mask < 2 ** tagIds.length; mask += 1) {
      filledSubsets.add(nodeKey(tagIds.filter((_, index) => (mask & (1 << index)) !== 0)));
    }
  }
  for (let first = 0; first < workspace.tags.length - 2; first += 1) {
    for (let second = first + 1; second < workspace.tags.length - 1; second += 1) {
      for (let third = second + 1; third < workspace.tags.length; third += 1) {
        const candidate = [workspace.tags[first].id, workspace.tags[second].id, workspace.tags[third].id];
        if (!filledSubsets.has(nodeKey(candidate))) return candidate;
      }
    }
  }
  throw new Error('Не удалось найти незаполненный набор из трёх тегов.');
}

const workspace = generateDiagnosticWorkspace();
const tagNames = new Map(workspace.tags.map((tag) => [tag.id, tag.name]));
const sizeDistribution = Array.from({ length: 6 }, (_, index) => {
  const count = workspace.elements.filter((element) => element.tagIds?.length === index + 1).length;
  return { tagsPerElement: index + 1, count, percent: count / workspace.elements.length * 100 };
});
const tagUsage = workspace.tags.map((tag) => {
  const count = workspace.elements.filter((element) => element.tagIds?.includes(tag.id)).length;
  return { id: tag.id, name: tag.name, count, percent: count / workspace.elements.length * 100 };
});
const scenarios = [
  { name: 'root', tagIds: [] },
  { name: 'filled-single-tag', tagIds: [workspace.tags[0].id] },
  { name: 'filled-exact-element', tagIds: workspace.elements[0].tagIds! },
  { name: 'unfilled', tagIds: findUnfilledNode(workspace) },
];

const report = {
  environment: {
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpu: cpus()[0]?.model ?? 'unknown',
    logicalCores: cpus().length,
    memoryGiB: totalmem() / 2 ** 30,
  },
  method: {
    runtime: 'Node.js; synchronous model functions; performance.now()',
    warmupIterations: 1,
    measuredIterations: ITERATIONS,
    note: 'Median, mean, minimum and maximum are reported without a predefined acceptance threshold.',
  },
  dataset: {
    seed: DIAGNOSTIC_SEED,
    elements: workspace.elements.length,
    tags: workspace.tags.length,
    sizeDistribution,
    tagUsage,
  },
  scenarios: scenarios.map(({ name, tagIds }) => ({
    name,
    tagIds,
    tagNames: tagIds.map((id) => tagNames.get(id) ?? id),
    selectionCount: selectElements(workspace, tagIds).length,
    measurements: {
      selection: measure(() => selectElements(workspace, tagIds)),
      transitions: measure(() => getTransitions(workspace, tagIds)),
      autocompleteSelection: measure(() => getAutocomplete(workspace, tagIds, 'тег_0', 'selection')),
      autocompleteAll: measure(() => getAutocomplete(workspace, tagIds, 'тег_0', 'all')),
    },
  })),
};

console.log(JSON.stringify(report, null, 2));
