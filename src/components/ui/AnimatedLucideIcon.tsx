import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { chipBackground, colors } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Lucide icon (SVG, ISC-licensed path data) that draws itself stroke by
 * stroke — the effect from lucide-animated.com. Font glyphs (our tab bar
 * uses those) can't do this; only real SVG paths can animate strokeDashoffset.
 * Each stroke is staggered, and the whole badge does a gentle spring pop.
 */

type Stroke =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number };

// Path data lifted verbatim from lucide-react-native (ISC). Kept inline so the
// draw animation owns each stroke, which importing the components wouldn't allow.
export const LUCIDE_ICONS: Record<string, Stroke[]> = {
  sparkles: [
    {
      kind: 'path',
      d: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z',
    },
    { kind: 'path', d: 'M20 2v4' },
    { kind: 'path', d: 'M22 4h-4' },
    { kind: 'circle', cx: 4, cy: 20, r: 2 },
  ],
  receipt: [
    { kind: 'path', d: 'M12 17V7' },
    { kind: 'path', d: 'M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8' },
    {
      kind: 'path',
      d: 'M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z',
    },
  ],
  target: [
    { kind: 'circle', cx: 12, cy: 12, r: 10 },
    { kind: 'circle', cx: 12, cy: 12, r: 6 },
    { kind: 'circle', cx: 12, cy: 12, r: 2 },
  ],
  'chart-pie': [
    {
      kind: 'path',
      d: 'M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z',
    },
    { kind: 'path', d: 'M21.21 15.89A10 10 0 1 1 8 2.83' },
  ],
  wallet: [
    {
      kind: 'path',
      d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
    },
    { kind: 'path', d: 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' },
  ],
  'circle-check': [
    { kind: 'circle', cx: 12, cy: 12, r: 10 },
    { kind: 'path', d: 'm9 12 2 2 4-4' },
  ],
  house: [
    { kind: 'path', d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' },
    {
      kind: 'path',
      d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    },
  ],
  settings: [
    {
      kind: 'path',
      d: 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915',
    },
    { kind: 'circle', cx: 12, cy: 12, r: 3 },
  ],
  'chart-column': [
    { kind: 'path', d: 'M5 21v-6' },
    { kind: 'path', d: 'M12 21V3' },
    { kind: 'path', d: 'M19 21V9' },
  ],
  flag: [
    {
      kind: 'path',
      d: 'M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528',
    },
  ],
};

const DRAW_DURATION = 520;
const STAGGER = 130;
const START_DELAY = 140;
// Longer than any single 24×24 lucide stroke, so it starts fully hidden.
const PATH_DASH = 120;

interface StrokeViewProps {
  stroke: Stroke;
  delay: number;
  color: string;
  strokeWidth: number;
}

function StrokeView({ stroke, delay, color, strokeWidth }: StrokeViewProps) {
  const dash = stroke.kind === 'circle' ? 2 * Math.PI * stroke.r : PATH_DASH;
  const offset = useSharedValue(dash);

  useEffect(() => {
    offset.value = withDelay(delay, withTiming(0, { duration: DRAW_DURATION, easing: Easing.out(Easing.cubic) }));
  }, [offset, delay]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
    strokeDasharray: dash,
    animatedProps,
  };

  if (stroke.kind === 'circle') {
    return <AnimatedCircle cx={stroke.cx} cy={stroke.cy} r={stroke.r} {...common} />;
  }
  return <AnimatedPath d={stroke.d} {...common} />;
}

interface AnimatedLucideIconProps {
  name: keyof typeof LUCIDE_ICONS;
  /** Bumped by the caller (e.g. the onboarding step) to replay the animation. */
  replayKey?: number | string;
  size?: number;
  color?: string;
}

export function AnimatedLucideIcon({
  name,
  replayKey,
  size = 72,
  color = colors.textPrimary,
}: AnimatedLucideIconProps) {
  const strokes = LUCIDE_ICONS[name];
  const glyph = size * 0.46;
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = 0.6;
    scale.value = withDelay(START_DELAY, withSpring(1, { damping: 8, stiffness: 160, mass: 0.7 }));
  }, [scale, replayKey]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.badge,
        badgeStyle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: chipBackground(color, 0.12) },
      ]}
    >
      <Svg width={glyph} height={glyph} viewBox="0 0 24 24">
        {strokes.map((stroke, i) => (
          <StrokeView
            // eslint-disable-next-line react/no-array-index-key
            key={`${replayKey}-${i}`}
            stroke={stroke}
            delay={START_DELAY + i * STAGGER}
            color={color}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

interface TabStrokeProps {
  stroke: Stroke;
  focused: boolean;
  delay: number;
  color: string;
}

// Self-contained per-stroke animation (mirrors StrokeView, the version that
// actually draws) instead of a shared progress prop, which didn't animate.
function TabStroke({ stroke, focused, delay, color }: TabStrokeProps) {
  const dash = stroke.kind === 'circle' ? 2 * Math.PI * stroke.r : PATH_DASH;
  const offset = useSharedValue(0); // 0 = fully drawn

  useEffect(() => {
    if (focused) {
      // One sequence: snap hidden (0ms), hold for the stagger, then draw.
      // Doing the hide as a separate assignment races the draw and animates
      // 0→0 (nothing) — this is why the tab icons weren't animating.
      offset.value = withSequence(
        withTiming(dash, { duration: 0 }),
        withDelay(delay, withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })),
      );
    } else {
      offset.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  const common = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
    strokeDasharray: dash,
    animatedProps,
  };

  if (stroke.kind === 'circle') {
    return <AnimatedCircle cx={stroke.cx} cy={stroke.cy} r={stroke.r} {...common} />;
  }
  return <AnimatedPath d={stroke.d} {...common} />;
}

interface AnimatedLucideTabIconProps {
  name: keyof typeof LUCIDE_ICONS;
  focused: boolean;
  size?: number;
}

/**
 * Tab-bar variant: no badge circle. On becoming active it redraws its
 * strokes (staggered) and does a quick spring pop; inactive tabs render
 * fully drawn in the muted color.
 */
export function AnimatedLucideTabIcon({ name, focused, size = 24 }: AnimatedLucideTabIconProps) {
  const strokes = LUCIDE_ICONS[name];
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withTiming(0.7, { duration: 0 }),
        withSpring(1, { damping: 7, stiffness: 200, mass: 0.6 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = focused ? colors.textPrimary : colors.textMuted;

  return (
    <Animated.View style={[styles.tabIcon, containerStyle]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {strokes.map((stroke, i) => (
          <TabStroke
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            stroke={stroke}
            focused={focused}
            delay={i * 90}
            color={color}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  tabIcon: { alignItems: 'center', justifyContent: 'center', height: 28 },
});
