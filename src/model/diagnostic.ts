import type { Tag, Workspace } from '../types';

export const DIAGNOSTIC_SEED = 20_261_111;

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function generateDiagnosticWorkspace(
  count = 10_000,
  tagCount = 100,
  seed = DIAGNOSTIC_SEED,
): Workspace {
  const random = randomGenerator(seed);
  const tags: Tag[] = Array.from({ length: tagCount }, (_, index) => ({
    id: `diagnostic-tag-${String(index + 1).padStart(3, '0')}`,
    name: `тег_${String(index + 1).padStart(3, '0')}`,
    description: '',
  }));

  return {
    tags,
    elements: Array.from({ length: count }, (_, index) => {
      const size = 1 + Math.floor(random() * 6);
      const pool = Array.from({ length: tagCount }, (_, tagIndex) => tagIndex);
      const selected: string[] = [];
      for (let position = 0; position < size; position += 1) {
        const chosen = position + Math.floor(random() * (tagCount - position));
        [pool[position], pool[chosen]] = [pool[chosen], pool[position]];
        selected.push(tags[pool[position]].id);
      }
      const timestamp = 1_700_000_000_000 + index;
      return {
        id: `diagnostic-element-${String(index + 1).padStart(5, '0')}`,
        title: `Запись ${String(index + 1).padStart(5, '0')}`,
        content: { kind: 'text' as const, text: `Короткая диагностическая запись ${index + 1}.` },
        tagIds: selected.sort(),
        createdAt: timestamp,
        modifiedAt: timestamp,
      };
    }),
  };
}
