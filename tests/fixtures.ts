import type { Element, Tag, Workspace } from '../src/types';

export const ids = {
  repair: 'tag-repair',
  kitchen: 'tag-kitchen',
  electrical: 'tag-electrical',
  budget: 'tag-budget',
  urgent: 'tag-urgent',
  garden: 'tag-garden',
  birthday: 'tag-birthday',
  may: 'tag-may',
  day5: 'tag-day-5',
  igor: 'tag-igor',
  artemyev: 'tag-artemyev',
  june: 'tag-june',
  day10: 'tag-day-10',
  anna: 'tag-anna',
  dream: 'tag-dream',
} as const;

const tag = (id: string, name: string, description = ''): Tag => ({ id, name, description });

export function makeDemoWorkspace(): Workspace {
  const tags = [
    tag(ids.repair, 'ремонт'),
    tag(ids.kitchen, 'кухня'),
    tag(ids.electrical, 'электрика'),
    tag(ids.budget, 'бюджет', 'Планируемые расходы'),
    tag(ids.urgent, 'срочно'),
    tag(ids.garden, 'сад'),
    tag(ids.birthday, 'день_рождения'),
    tag(ids.may, 'май'),
    tag(ids.day5, '5'),
    tag(ids.igor, 'игорь'),
    tag(ids.artemyev, 'артемьев'),
    tag(ids.june, 'июнь'),
    tag(ids.day10, '10'),
    tag(ids.anna, 'анна'),
    tag(ids.dream, 'мечта'),
  ];

  const text = (id: string, title: string, value: string, tagIds: string[] | null, index: number): Element => ({
    id,
    title,
    content: value ? { kind: 'text', text: value } : { kind: 'empty' },
    tagIds,
    createdAt: 1_700_000_000_000 + index * 1_000,
    modifiedAt: 1_700_000_000_000 + index * 1_000,
  });

  const elements = [
    text('E0', 'Общее', 'Общая запись', [], 0),
    text('E1', 'Ремонт', 'Подготовить ремонт', [ids.repair], 1),
    text('E2', 'Кухня', 'Заметка о кухне', [ids.kitchen], 2),
    text('E3', 'План', 'План электрики при ремонте кухни', [ids.repair, ids.kitchen, ids.electrical], 3),
    text('E4', 'Смета', 'Срочно согласовать бюджет ремонта кухни', [ids.repair, ids.kitchen, ids.budget, ids.urgent], 4),
    text('E5', 'План', 'Бюджет электрики при ремонте кухни', [ids.repair, ids.kitchen, ids.electrical, ids.budget], 5),
    text('E6', '', 'Полить сад', [ids.garden], 6),
    text('E7', 'Игорь', '', [ids.birthday, ids.may, ids.day5, ids.igor, ids.artemyev], 7),
    text('E8', 'Анна', '', [ids.birthday, ids.june, ids.day10, ids.anna], 8),
    text('E9', 'Набросок', 'Запись для последующей разметки', null, 9),
  ];

  return { tags, elements };
}

export function element(workspace: Workspace, id: string): Element {
  const found = workspace.elements.find((item) => item.id === id);
  if (!found) throw new Error(`Missing fixture ${id}`);
  return found;
}
