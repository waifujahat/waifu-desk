import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Content surface shared by dashboard, Codex, activity and settings. */
export function Panel({ title, description, action, children, className = '' }: PanelProps) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-heading">
        <div className="panel-title-block">
          <h3>{title}</h3>
          {description && <p className="panel-description">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
