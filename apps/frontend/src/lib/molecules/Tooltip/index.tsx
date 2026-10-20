import { useId, useState, type ReactNode } from 'react';
import { classNames } from '@/utils/classNames';
import styles from './style.module.css';

export interface TooltipTriggerProps {
  'aria-describedby'?: string;
}

interface TooltipProps {
  content: string;
  active?: boolean;
  children: (triggerProps: TooltipTriggerProps) => ReactNode;
}

export function Tooltip({ content, active = true, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  if (!active) return <>{children({})}</>;

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setVisible(false);
      }}
    >
      {children({ 'aria-describedby': tooltipId })}
      <span
        id={tooltipId}
        role="tooltip"
        className={classNames(styles.tooltip, visible && styles.visible)}
      >
        {content}
      </span>
    </span>
  );
}
