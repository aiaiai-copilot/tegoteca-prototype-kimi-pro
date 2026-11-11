export function canonicalTagName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC').toLocaleLowerCase('ru-RU');
}

export function displayTagName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function uniqueTagIds(tagIds: readonly string[]): string[] {
  return [...new Set(tagIds)];
}

export function nodeKey(tagIds: readonly string[]): string {
  return JSON.stringify([...uniqueTagIds(tagIds)].sort());
}

export function sameNode(a: readonly string[] | null, b: readonly string[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && isSubset(a, b);
}

export function isSubset(subset: readonly string[], superset: readonly string[]): boolean {
  const available = new Set(superset);
  return subset.every((tagId) => available.has(tagId));
}

export function differenceTagIds(source: readonly string[], removed: readonly string[]): string[] {
  const excluded = new Set(removed);
  return source.filter((tagId) => !excluded.has(tagId));
}
