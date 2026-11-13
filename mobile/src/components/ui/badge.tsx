import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Severity } from '@/lib/types';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Kind = 'nasa' | 'demo' | 'brand' | 'neutral' | Severity;

const STATUS_ICON: Record<Severity, IconName> = {
  good: 'check',
  warning: 'warning',
  serious: 'warning',
  critical: 'warning',
};

export function Badge({ kind = 'neutral', label, icon }: { kind?: Kind; label: string; icon?: IconName }) {
  const t = useTheme();
  let bg: string = t.cardMuted;
  let fg: string = t.textSecondary;
  let ic: IconName | undefined = icon;
  if (kind === 'nasa') {
    bg = t.series[0] + '1f';
    fg = t.series[0];
    ic = ic ?? 'satellite';
  } else if (kind === 'demo') {
    bg = t.demoSoft;
    fg = t.demo;
    ic = ic ?? 'science';
  } else if (kind === 'brand') {
    bg = t.brandSoft;
    fg = t.brandInk;
  } else if (kind in t.status) {
    const c = t.status[kind as Severity];
    bg = c + '22';
    fg = t.text;
    ic = ic ?? STATUS_ICON[kind as Severity];
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Icon name={ic} size={11} color={c} />
        <Text variant="caption" weight="600" style={{ color: fg }}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {ic ? <Icon name={ic} size={11} color={fg} /> : null}
      <Text variant="caption" weight="600" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
});
