import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DURATION, EASE_IN_OUT, selectionHaptic } from '@/lib/motion';

import { Text } from './text';

type Option<T extends string> = { value: T; label: string };

/**
 * Segmented control with a pill that slides to the chosen option (state indication,
 * 220ms ease-in-out). `scroll` makes it a horizontal chip row for many options.
 * Items are at least 44pt tall (md) / 40pt (sm).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  scroll,
  size = 'md',
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  scroll?: boolean;
  size?: 'sm' | 'md';
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const ready = useSharedValue(0);

  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    if (reduced || ready.get() === 0) {
      x.set(l.x);
      w.set(l.width);
      ready.set(1);
      return;
    }
    x.set(withTiming(l.x, { duration: DURATION.state, easing: EASE_IN_OUT }));
    w.set(withTiming(l.width, { duration: DURATION.state, easing: EASE_IN_OUT }));
  }, [value, layouts, reduced, x, w, ready]);

  const pill = useAnimatedStyle(() => ({ opacity: ready.get(), width: w.get(), transform: [{ translateX: x.get() }] }));

  const items = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={o.value}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onLayout={(e) => {
          const l = e.nativeEvent.layout;
          setLayouts((prev) => (prev[o.value]?.x === l.x && prev[o.value]?.width === l.width ? prev : { ...prev, [o.value]: l }));
        }}
        onPress={() => {
          if (o.value !== value) selectionHaptic();
          onChange(o.value);
        }}
        style={[styles.item, size === 'sm' ? styles.itemSm : styles.itemMd, !scroll && { flex: 1 }]}>
        <Text variant={size === 'sm' ? 'caption' : 'label'} weight={active ? '700' : '500'} tone={active ? 'primary' : 'secondary'} numberOfLines={1}>
          {o.label}
        </Text>
      </Pressable>
    );
  });

  const indicator = (
    <Animated.View
      pointerEvents="none"
      style={[styles.pill, { backgroundColor: t.card, shadowColor: '#000', top: 3, bottom: 3 }, pill]}
    />
  );

  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.track, { backgroundColor: t.cardMuted }]}>
        {indicator}
        {items}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.track, { backgroundColor: t.cardMuted }]}>
      {indicator}
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3, borderRadius: Radius.md, gap: 2 },
  item: { paddingHorizontal: 14, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  itemMd: { minHeight: 44 },
  itemSm: { minHeight: 40, paddingHorizontal: 10 },
  pill: {
    position: 'absolute',
    left: 0,
    borderRadius: 9,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
