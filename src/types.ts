export interface Tag {
  id: string;
  name: string;
  description: string;
}

export interface EmptyContent {
  kind: 'empty';
}

export interface TextContent {
  kind: 'text';
  text: string;
}

export type FileKind = 'image' | 'audio' | 'video' | 'other';

export interface FileContent {
  kind: 'file';
  fileKind: FileKind;
  blob: Blob;
  name: string;
  mime: string;
}

export type Content = EmptyContent | TextContent | FileContent;

export interface Element {
  id: string;
  title: string;
  content: Content;
  tagIds: string[] | null;
  createdAt: number;
  modifiedAt: number;
}

export interface Workspace {
  tags: Tag[];
  elements: Element[];
}

export type ViewMode = 'own' | 'selection';
export type SortMode = 'modified' | 'title';

export function isMarked(element: Element): boolean {
  return element.tagIds !== null;
}
