import type { ReactNode } from 'react';

interface CalloutProps {
  tone?: 'info' | 'tip' | 'warning';
  title: string;
  children: ReactNode;
}

function Callout({ tone = 'info', title, children }: CalloutProps) {
  return (
    <div className={`callout ${tone}`}>
      <p className="callout-title">{title}</p>
      <div>{children}</div>
    </div>
  );
}

export default Callout;
