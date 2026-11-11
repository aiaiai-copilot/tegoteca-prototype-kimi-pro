import type { Element, FileKind, Tag, Workspace } from '../types';

export const demoTagIds = {
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
    tag(demoTagIds.repair, 'ремонт'),
    tag(demoTagIds.kitchen, 'кухня'),
    tag(demoTagIds.electrical, 'электрика'),
    tag(demoTagIds.budget, 'бюджет', 'Планируемые расходы'),
    tag(demoTagIds.urgent, 'срочно'),
    tag(demoTagIds.garden, 'сад'),
    tag(demoTagIds.birthday, 'день_рождения'),
    tag(demoTagIds.may, 'май'),
    tag(demoTagIds.day5, '5'),
    tag(demoTagIds.igor, 'игорь'),
    tag(demoTagIds.artemyev, 'артемьев'),
    tag(demoTagIds.june, 'июнь'),
    tag(demoTagIds.day10, '10'),
    tag(demoTagIds.anna, 'анна'),
    tag(demoTagIds.dream, 'мечта'),
  ];
  const item = (id: string, title: string, text: string, tagIds: string[] | null, index: number): Element => ({
    id,
    title,
    content: text ? { kind: 'text', text } : { kind: 'empty' },
    tagIds,
    createdAt: 1_700_000_000_000 + index * 1_000,
    modifiedAt: 1_700_000_000_000 + index * 1_000,
  });

  return {
    tags,
    elements: [
      item('E0', 'Общее', 'Общая запись', [], 0),
      item('E1', 'Ремонт', 'Подготовить ремонт', [demoTagIds.repair], 1),
      item('E2', 'Кухня', 'Заметка о кухне', [demoTagIds.kitchen], 2),
      item('E3', 'План', 'План электрики при ремонте кухни', [demoTagIds.repair, demoTagIds.kitchen, demoTagIds.electrical], 3),
      item('E4', 'Смета', 'Срочно согласовать бюджет ремонта кухни', [demoTagIds.repair, demoTagIds.kitchen, demoTagIds.budget, demoTagIds.urgent], 4),
      item('E5', 'План', 'Бюджет электрики при ремонте кухни', [demoTagIds.repair, demoTagIds.kitchen, demoTagIds.electrical, demoTagIds.budget], 5),
      item('E6', '', 'Полить сад', [demoTagIds.garden], 6),
      item('E7', 'Игорь', '', [demoTagIds.birthday, demoTagIds.may, demoTagIds.day5, demoTagIds.igor, demoTagIds.artemyev], 7),
      item('E8', 'Анна', '', [demoTagIds.birthday, demoTagIds.june, demoTagIds.day10, demoTagIds.anna], 8),
      item('E9', 'Набросок', 'Запись для последующей разметки', null, 9),
    ],
  };
}

export interface DemoMediaItem {
  id: string;
  title: string;
  tagName: string;
  fileKind: FileKind;
  name: string;
  mime: string;
  blob: Blob;
}

export async function fetchDemoMedia(): Promise<DemoMediaItem[]> {
  const definitions = [
    { id: 'demo-image', title: 'Пример изображения', tagName: 'изображение', fileKind: 'image' as const, name: 'demo-image.png', mime: 'image/png' },
    { id: 'demo-audio', title: 'Пример аудио', tagName: 'аудио', fileKind: 'audio' as const, name: 'demo-tone.wav', mime: 'audio/wav' },
    { id: 'demo-video', title: 'Пример видео', tagName: 'видео', fileKind: 'video' as const, name: 'demo-video.webm', mime: 'video/webm' },
    { id: 'demo-file', title: 'Пример другого файла', tagName: 'документ', fileKind: 'other' as const, name: 'demo-note.txt', mime: 'text/plain;charset=utf-8' },
  ];

  return Promise.all(definitions.map(async (definition) => {
    const response = await fetch(`/media/${definition.name}`);
    if (!response.ok) throw new Error(`Не удалось загрузить демонстрационный файл ${definition.name}.`);
    return { ...definition, blob: await response.blob() };
  }));
}
