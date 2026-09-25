import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';

export interface ButtonProps extends Omit<AriaButtonProps, 'className'> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'secondary', ...props }: ButtonProps) {
  return <AriaButton {...props} className={`button button-${variant}`} />;
}
