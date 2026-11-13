import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentRef, Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS: { name: string; href: '/' | '/alerts' | '/advice' | '/history' | '/drone'; label: string; icon: IconName }[] = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'alerts', href: '/alerts', label: 'Alerts', icon: 'warning' },
  { name: 'advice', href: '/advice', label: 'Advice', icon: 'bulb' },
  { name: 'history', href: '/history', label: 'History', icon: 'history' },
  { name: 'drone', href: '/drone', label: 'Drone', icon: 'drone' },
];

/** Web: a phone-style bottom tab bar so the web build looks like the app. */
export default function AppTabs() {
  const t = useTheme();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View style={styles.wrap}>
          <View style={[styles.bar, { backgroundColor: t.card, borderColor: t.border }]}>
            {TABS.map((tab) => (
              <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
                <TabButton icon={tab.icon} label={tab.label} />
              </TabTrigger>
            ))}
          </View>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  icon,
  label,
  isFocused,
  ref,
  ...props
}: Omit<TabTriggerSlotProps, 'ref'> & { icon: IconName; label: string; ref?: Ref<ComponentRef<typeof Pressable>> }) {
  const t = useTheme();
  const color = isFocused ? t.brand : t.textMuted;
  return (
    <Pressable ref={ref} {...props} style={styles.button}>
      <View style={[styles.pill, isFocused && { backgroundColor: t.brandSoft }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text variant="caption" weight={isFocused ? '600' : '500'} style={{ color, fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12 },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  button: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 },
  pill: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999 },
});
