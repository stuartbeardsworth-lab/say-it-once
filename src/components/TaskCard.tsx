import { useId } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { RouteLink, type Route } from '../router';
import { Icon, type IconName } from './icons';

// The large cards on Home, in the original app's style: an icon, a title,
// a line saying what it's for, and an arrow. The title is the card's name
// for screen readers and voice control; the line is read after it as a
// description.

interface CardProps {
  icon: IconName;
  title: string;
  detail: string;
  /** 'add' is the orange Add something card, 'support' the peach Find support card. */
  tone?: 'plain' | 'add' | 'support';
}

function CardInside({ icon, title, detail, titleId, detailId }: CardProps & { titleId: string; detailId: string }) {
  return (
    <>
      <span className="task-card-icon">
        <Icon name={icon} />
      </span>
      <span className="task-card-copy">
        <span className="task-card-title" id={titleId}>
          {title}
        </span>
        <span className="task-card-detail" id={detailId}>
          {detail}
        </span>
      </span>
      <span className="task-card-arrow" aria-hidden="true">
        ›
      </span>
    </>
  );
}

export function TaskButton({ onPress, tone = 'plain', ...card }: CardProps & { onPress: () => void }) {
  const id = useId();
  return (
    <AriaButton
      className={`task-card task-card-${tone}`}
      onPress={onPress}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-detail`}
    >
      <CardInside {...card} titleId={`${id}-title`} detailId={`${id}-detail`} />
    </AriaButton>
  );
}

export function TaskLink({ to, tone = 'plain', ...card }: CardProps & { to: Route }) {
  const id = useId();
  return (
    <RouteLink
      to={to}
      className={`task-card task-card-${tone}`}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-detail`}
    >
      <CardInside {...card} titleId={`${id}-title`} detailId={`${id}-detail`} />
    </RouteLink>
  );
}
