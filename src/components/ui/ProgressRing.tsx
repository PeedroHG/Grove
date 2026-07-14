import Svg, { Circle, Defs, Filter, FeGaussianBlur } from 'react-native-svg';

import { colors } from '@/theme/tokens';

interface ProgressRingProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ progress, size = 180, strokeWidth = 14 }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <Filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation={4} />
        </Filter>
      </Defs>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.border}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.textPrimary}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        fill="none"
        opacity={0.35}
        filter="url(#ringGlow)"
        rotation={-90}
        origin={`${center}, ${center}`}
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.textPrimary}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        fill="none"
        rotation={-90}
        origin={`${center}, ${center}`}
      />
    </Svg>
  );
}
