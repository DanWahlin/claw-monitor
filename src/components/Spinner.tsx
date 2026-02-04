import React from 'react';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  color?: string;
}

export function Spinner({ color = 'cyan' }: SpinnerProps) {
  return (
    <Text color={color}>
      <InkSpinner type="dots" />
    </Text>
  );
}
