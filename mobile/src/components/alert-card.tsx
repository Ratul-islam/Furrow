import { StyleSheet, View } from 'react-native';

import { Donut } from '@/components/charts/donut';
import { CompareBars, MiniBars } from '@/components/charts/mini';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { AlertKind, FieldAlert } from '@/lib/alerts';
import { MONTH_INITIALS, whole } from '@/lib/format';

export const ALERT_ICON: Record<AlertKind, IconName> = {
  drought: 'dry',
  flood: 'flood',
  heat: 'sun',
  heavy_rain: 'rain',
  cold: 'cold',
  dry_spell: 'dry',
  waterlogging: 'water',
  pests: 'bug',
};

export const LEVEL_WORD = { serious: 'High risk', warning: 'Some risk', good: 'Low risk' } as const;

/**
 * One warning, at a glance: bold risk %, what and when, one line why, one picture, one action.
 * `compact` drops the picture (Home).
 */
export function AlertCard({ alert, compact, onPress }: { alert: FieldAlert; compact?: boolean; onPress?: () => void }) {
  const t = useTheme();
  const c = t.status[alert.level];
  return (
    <Card onPress={onPress}>
      <View style={styles.head}>
        <Donut value={alert.risk} color={c} size={compact ? 64 : 78} label={alert.riskText} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.titleRow}>
            <Icon name={ALERT_ICON[alert.kind]} size={18} color={c} />
            <Text variant="title" style={{ flex: 1, fontSize: 19, lineHeight: 24 }}>
              {alert.title}
            </Text>
          </View>
          <Text variant="caption" tone="secondary">
            {alert.when}
          </Text>
          <Text variant="label" weight="700">
            {alert.why}
          </Text>
          <View style={[styles.level, { backgroundColor: c + '22' }]}>
            <View style={[styles.dot, { backgroundColor: c }]} />
            <Text variant="caption" weight="800">
              {LEVEL_WORD[alert.level]}
            </Text>
          </View>
        </View>
      </View>

      {alert.future ? (
        <View style={{ marginTop: 12 }}>
          <CompareBars
            max={100}
            items={[
              { label: 'Now', value: alert.risk, color: t.axis },
              { label: alert.future.label, value: alert.future.risk, color: c },
            ]}
            format={(v) => `${Math.round(v)}%`}
          />
        </View>
      ) : null}

      {!compact ? <Picture alert={alert} color={c} /> : null}

      <View style={[styles.action, { backgroundColor: t.brandSoft }]}>
        <Icon name="bulb" size={16} color={t.brand} />
        <Text variant="label" weight="700" style={{ flex: 1 }}>
          {alert.action}
        </Text>
      </View>
    </Card>
  );
}

function Picture({ alert, color }: { alert: FieldAlert; color: string }) {
  const t = useTheme();
  if (alert.compare && !alert.future) {
    return (
      <View style={{ marginTop: 12 }}>
        <CompareBars items={alert.compare.map((x, i) => ({ label: x.label, value: x.value, color: i === 0 ? color : t.axis }))} format={(v) => `${whole(v)} ${alert.compare?.[0]?.unit ?? ''}`} />
      </View>
    );
  }
  if (alert.years) {
    return (
      <View style={{ marginTop: 12, gap: 4 }}>
        <MiniBars values={alert.years.values} highlight={alert.years.highlight} accent={color} color={t.axis} height={40} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
          <Text variant="caption" tone="muted">
            {alert.years.from}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
            {alert.years.label}
          </Text>
          <Text variant="caption" tone="muted">
            {alert.years.to}
          </Text>
        </View>
      </View>
    );
  }
  if (alert.months) {
    return (
      <View style={{ marginTop: 12 }}>
        <MiniBars values={alert.months} highlight={alert.highlight} accent={color} color={t.axis} height={36} />
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {MONTH_INITIALS.map((m, i) => (
            <Text key={i} variant="caption" tone={alert.highlight?.includes(i) ? 'primary' : 'muted'} weight={alert.highlight?.includes(i) ? '700' : '400'} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>
              {m}
            </Text>
          ))}
        </View>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  action: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, marginTop: 12, alignItems: 'center' },
});
