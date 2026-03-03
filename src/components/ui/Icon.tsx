import React from 'react';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export interface IconProps {
  /** Feather icon name */
  name: FeatherIconName;
  /** Icon size in pixels (default: 20) */
  size?: number;
  /** Icon color (default: text.primary) */
  color?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Icon({ name, size = 20, color = colors.text.primary }: IconProps) {
  return <Feather name={name} size={size} color={color} />;
}
