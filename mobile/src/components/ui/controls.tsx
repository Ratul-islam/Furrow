/**
 * Animated controls: Button, Spinner, Skeleton, ProgressBar, OptionCard.
 * All motion is Reanimated CSS (works the same on iOS, Android and web) and
 * respects reduced motion.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DURATION, EASE_IN_OUT, EASE_OUT_CSS, selectionHaptic } from '@/lib/motion';

import { Icon, type IconName } from './icon';
import { Text } from './text';

const SPIN = { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } };
const PULSE = { from: { opacity: 0.45 }, to: { opacity: 1 } };

export function Spinner({ size = 20, color }: { size?: number; color?: string }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(2, size / 9), borderColor: (color ?? t.brand) + '33', borderTopColor: color ?? t.brand },
        reduced ? null : { animationName: SPIN, animationDuration: '800ms', animationIterationCount: 'infinite', animationTimingFunction: 'linear' },
      ]}
    />
  );
}

/** Placeholder block that gently pulses while content loads. */
export function Skeleton({ height = 16, width = '100%', radius = 8, style }: { height?: number; width?: ViewStyle['width']; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        { height, width, borderRadius: radius, backgroundColor: t.cardMuted },
        reduced ? null : { animationName: PULSE, animationDuration: '900ms', animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' },
        style,
      ]}
    />
  );
}

export function Button({
  label,
  onPress,
  icon,
  kind = 'primary',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const [pressed, setPressed] = useState(false);
  const bg = { primary: t.brand, secondary: t.brandSoft, ghost: 'transparent', danger: t.status.critical }[kind];
  const fg = kind === 'primary' || kind === 'danger' ? '#ffffff' : t.brandInk;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={style}>
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: bg, opacity: disabled ? 0.45 : 1, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: t.border },
          { transform: [{ scale: pressed ? 0.97 : 1 }], transitionProperty: ['transform', 'opacity'], transitionDuration: `${DURATION.press}ms`, transitionTimingFunction: EASE_OUT_CSS },
        ]}>
        {loading ? <Spinner size={18} color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
        <Text variant="label" weight="700" style={{ color: fg, fontSize: 16 }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Thin bar that glides to `progress` (0–1). */
export function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const p = useSharedValue(progress);
  useEffect(() => {
    p.set(reduced ? progress : withTiming(progress, { duration: DURATION.bar, easing: EASE_IN_OUT }));
  }, [progress, reduced, p]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: p.get() }] }));
  return (
    <View style={[styles.track, { backgroundColor: t.cardMuted }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color ?? t.brand, borderRadius: 3, transformOrigin: 'left' }, fill]} />
    </View>
  );
}

/** A big tappable answer card with an icon; animates when chosen. */
export function OptionCard({
  label,
  hint,
  icon,
  selected,
  multi,
  onPress,
}: {
  label: string;
  hint?: string;
  icon?: IconName;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      <Animated.View
        style={[
          styles.option,
          {
            backgroundColor: selected ? t.brandSoft : t.card,
            borderColor: selected ? t.brand : t.border,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
            transitionDuration: `${DURATION.state}ms`,
            transitionTimingFunction: EASE_OUT_CSS,
          },
        ]}>
        {icon ? (
          <View style={[styles.optIcon, { backgroundColor: selected ? t.brand : t.cardMuted }]}>
            <Icon name={icon} size={20} color={selected ? '#fff' : t.textSecondary} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text variant="heading" style={{ fontSize: 16 }}>
            {label}
          </Text>
          {hint ? (
            <Text variant="caption" tone="secondary">
              {hint}
            </Text>
          ) : null}
        </View>
        <View style={[multi ? styles.check : styles.radio, { borderColor: selected ? t.brand : t.axis, backgroundColor: selected ? t.brand : 'transparent' }]}>
          {selected ? <Icon name="check" size={14} color="#fff" /> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function Chip({ children, active, onPress }: { children: ReactNode; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? t.brand : t.card,
            borderColor: active ? t.brand : t.border,
            transitionProperty: ['backgroundColor', 'borderColor'],
            transitionDuration: `${DURATION.state}ms`,
          } as ViewStyle,
        ]}>
        <Text variant="label" weight="600" style={{ color: active ? '#fff' : t.text }}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', width: '100%' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.md, borderWidth: 1.5, minHeight: 64 },
  optIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, minHeight: 44, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
