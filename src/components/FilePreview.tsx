import { useEffect, useState } from 'react';
import type { FileContent } from '../types';

export function FilePreview({ content, title }: { content: FileContent; title: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return;
    const objectUrl = URL.createObjectURL(content.blob);
    setUrl(objectUrl);
    return () => {
      setUrl('');
      URL.revokeObjectURL(objectUrl);
    };
  }, [content.blob]);

  return (
    <div className="file-preview">
      {content.fileKind === 'image' && url && <img src={url} alt={title || content.name} />}
      {content.fileKind === 'audio' && url && <audio controls preload="metadata" src={url}>Аудио: {content.name}</audio>}
      {content.fileKind === 'video' && url && <video controls preload="metadata" src={url}>Видео: {content.name}</video>}
      {content.fileKind === 'other' && <div className="other-file" aria-label="Другой файл">Файл: {content.name}</div>}
      <div className="file-meta">
        <span>{content.name}</span>
        {url && <a href={url} download={content.name}>Скачать файл</a>}
      </div>
    </div>
  );
}
