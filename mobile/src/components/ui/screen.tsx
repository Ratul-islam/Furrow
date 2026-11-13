import { Children, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEntrance } from '@/lib/motion';

import { Text } from './text';

/** Scrollable page with a large title, safe areas and room for the tab bar. */
export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 110 : 96) },
      ]}
      contentInsetAdjustmentBehavior="never">
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            {subtitle ? (
              <Text variant="overline" tone="muted">
                {subtitle}
              </Text>
            ) : null}
            <Text variant="display">{title}</Text>
          </View>
          {right}
        </View>
        {Children.toArray(children).map((child, i) => (
          <Reveal key={i} index={i + 1}>
            {child}
          </Reveal>
        ))}
        <Text variant="caption" tone="muted" style={styles.footer}>
          This is advice to help you decide, not a promise. Weather can still surprise us.
        </Text>
      </View>
    </ScrollView>
  );
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.sectionHead}>
          <Text variant="overline" tone="secondary">
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      <View style={{ gap: Spacing.three }}>
        {Children.toArray(children).map((child, i) => (
          <Reveal key={i} index={i + 1}>
            {child}
          </Reveal>
        ))}
      </View>
    </View>
  );
}

/** Fades and lifts its child in on first view; `index` staggers siblings by 50ms. */
export function Reveal({ index = 0, children, style, kind = 'rise' }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle>; kind?: 'rise' | 'fade' }) {
  const entrance = useEntrance(index, kind);
  return <Animated.View style={[style, entrance]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.four, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.five },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  section: { gap: Spacing.three },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  footer: { textAlign: 'center', paddingHorizontal: Spacing.five },
});
