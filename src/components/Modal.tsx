import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose(): void;
  wide?: boolean;
}

export function Modal({ title, children, onClose, wide = false }: ModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeRef} type="button" className="icon-button" aria-label={`Закрыть ${title.toLocaleLowerCase('ru')}`} onClick={onClose}>×</button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}
