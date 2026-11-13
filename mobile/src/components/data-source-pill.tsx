import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';

/** Shows where the numbers on screen come from; opens Data and methods. */
export function DataSourcePill() {
  const t = useTheme();
  const { source, syncing } = useData();
  const live = source === 'supabase';
  return (
    <Pressable
      onPress={() => router.push('/sources')}
      accessibilityRole="button"
      accessibilityLabel="Data and methods"
      style={({ pressed }) => [styles.pill, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.7 }]}>
      <Icon name={live ? 'database' : 'offline'} size={13} color={live ? t.status.good : t.textMuted} />
      <Text variant="caption" weight="600" tone="secondary">
        {syncing ? 'Syncing…' : live ? 'Supabase' : 'Offline data'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
});
