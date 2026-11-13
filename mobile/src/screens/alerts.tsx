import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { AlertCard } from '@/components/alert-card';
import { DrawMask } from '@/components/charts/kit';
import { GrowBar } from '@/components/charts/mini';
import { DataSourcePill } from '@/components/data-source-pill';
import { Card, CardHeader, SourceNote } from '@/components/ui/card';
import { Chip, Skeleton } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Insight } from '@/components/ui/insight';
import { Screen, Section } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { riskCalendar, type Forecast } from '@/lib/alerts';
import { useData } from '@/lib/data-context';
import { MONTH_INITIALS, MONTHS } from '@/lib/format';
import { DURATION, useEntrance } from '@/lib/motion';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AlertsScreen() {
  const t = useTheme();
  const { alerts, bundle, forecast, forecastLoading } = useData();
  const serious = alerts.filter((a) => a.level === 'serious').length;
  const watch = alerts.filter((a) => a.level === 'warning').length;
  const calm = alerts.length - serious - watch;
  const calendar = riskCalendar(bundle);
  const [filter, setFilter] = useState<'all' | 'serious' | 'warning' | 'good'>('all');

  return (
    <Screen title="Alerts" subtitle="Weather risks for your field" right={<DataSourcePill />}>
      <Insight
        icon="warning"
        color={serious ? t.status.serious : t.status.warning}
        title={serious ? `${serious} thing${serious > 1 ? 's need' : ' needs'} your attention now` : watch ? `${watch} thing${watch > 1 ? 's' : ''} to watch` : 'No big risks right now'}
        detail="From 30 years of NASA data for your area, your answers, and this week's forecast.">
        <View style={styles.stack}>
          {[
            [serious, t.status.serious],
            [watch, t.status.warning],
            [calm, t.status.good],
          ].map(([n, c], i) =>
            (n as number) > 0 ? (
              <View key={i} style={{ flex: n as number }}>
                <GrowBar fraction={1} color={c as string} height={12} delay={i * 120} track={false} />
              </View>
            ) : null,
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
          <Legend color={t.status.serious} label={`${serious} act now`} />
          <Legend color={t.status.warning} label={`${watch} watch`} />
          <Legend color={t.status.good} label={`${calm} low risk`} />
        </View>
      </Insight>

      <Section title="Next 7 days">
        <Card>
          {forecastLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={20} width="60%" />
              <Skeleton height={90} />
            </View>
          ) : forecast ? (
            <ForecastStrip forecast={forecast} />
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Icon name="offline" size={18} color={t.textMuted} />
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>
                No internet, so no forecast right now. The warnings below still work.
              </Text>
            </View>
          )}
          <SourceNote>Forecast from Open-Meteo (national weather models), not NASA. Only used for this week.</SourceNote>
        </Card>
      </Section>

      <Section title="Risk calendar">
        <Card>
          <CardHeader title="When each risk is high" subtitle="From 30 years of NASA data for your area" />
          <RiskGrid rows={calendar} />
        </Card>
      </Section>

      <Section title="All warnings">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              ['all', `All (${alerts.length})`],
              ['serious', `Act now (${serious})`],
              ['warning', `Watch (${watch})`],
              ['good', `Low risk (${calm})`],
            ] as const
          ).map(([v, l]) => (
            <Chip key={v} active={filter === v} onPress={() => setFilter(v)}>
              {l}
            </Chip>
          ))}
        </View>
        <View style={{ gap: 12 }}>
          {alerts
            .filter((a) => filter === 'all' || a.level === filter)
            .map((a, i) => (
              <AlertItem key={a.id} index={i}>
                <AlertCard alert={a} />
              </AlertItem>
            ))}
        </View>
      </Section>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

function ForecastStrip({ forecast }: { forecast: Forecast }) {
  const t = useTheme();
  const maxRain = Math.max(20, ...forecast.days.map((d) => d.rain));
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {forecast.days.map((d, i) => (
          <ForecastDay key={d.date} index={i} label={i === 0 ? 'Today' : DAY[new Date(d.date + 'T00:00:00').getDay()]} tmax={d.tmax} rain={d.rain} maxRain={maxRain} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
        <Legend color={t.series[0]} label="Rain (mm)" />
        <Legend color={t.series[1]} label="Hot (35 °C+)" />
      </View>
    </View>
  );
}

function ForecastDay({ index, label, tmax, rain, maxRain }: { index: number; label: string; tmax: number; rain: number; maxRain: number }) {
  const t = useTheme();
  const entrance = useEntrance(index);
  const h = 56;
  const hot = tmax >= 35;
  return (
    <Animated.View style={[{ flex: 1, alignItems: 'center', gap: 4 }, entrance]}>
      <Text variant="caption" weight="600" tone="secondary">
        {label}
      </Text>
      <Text variant="label" weight="700" style={{ color: hot ? t.series[1] : t.text }}>
        {Math.round(tmax)}°
      </Text>
      <View style={{ height: h, width: '70%', justifyContent: 'flex-end', borderRadius: 6, backgroundColor: t.cardMuted, overflow: 'hidden' }}>
        <View style={{ height: Math.max(2, (rain / maxRain) * h), backgroundColor: rain >= 50 ? t.status.critical : t.series[0], borderRadius: 4 }} />
        <DrawMask direction="y" bg={t.cardMuted} />
      </View>
      <Text variant="caption" tone="secondary">
        {rain < 1 ? '–' : Math.round(rain)}
      </Text>
    </Animated.View>
  );
}

const LEVEL_WORD = { serious: 'High', warning: 'Some', good: 'Low' } as const;

function RiskGrid({ rows }: { rows: { label: string; values: ('serious' | 'warning' | 'good')[] }[] }) {
  const t = useTheme();
  const [month, setMonth] = useState<number | null>(null);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 84 }} />
        {MONTH_INITIALS.map((m, i) => (
          <Text key={i} variant="caption" weight={month === i ? '700' : '400'} tone={month === i ? 'primary' : 'muted'} style={{ flex: 1, textAlign: 'center' }}>
            {m}
          </Text>
        ))}
      </View>
      <View>
        {rows.map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text variant="caption" weight="600" style={{ width: 84 }}>
              {r.label}
            </Text>
            {r.values.map((v, i) => (
              <Pressable key={i} accessibilityLabel={`${MONTHS[i]}: ${r.label} ${LEVEL_WORD[v]}`} onPress={() => setMonth(month === i ? null : i)} style={{ flex: 1, paddingHorizontal: 1.5 }}>
                <View
                  style={{
                    height: 24,
                    borderRadius: 5,
                    backgroundColor: v === 'good' ? t.cardMuted : t.status[v],
                    opacity: month != null && month !== i ? 0.35 : v === 'warning' ? 0.8 : 1,
                    borderWidth: month === i ? 2 : 0,
                    borderColor: t.text,
                    transitionProperty: 'opacity',
                    transitionDuration: '200ms',
                  } as object}
                />
              </Pressable>
            ))}
          </View>
        ))}
        <DrawMask />
      </View>
      {month != null ? (
        <MonthDetail key={month} month={month} rows={rows} />
      ) : (
        <Text variant="caption" tone="secondary">
          Tap a month to see its risks.
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 4 }}>
        <Legend color={t.status.serious} label="High" />
        <Legend color={t.status.warning} label="Some" />
        <Legend color={t.cardMuted} label="Low" />
      </View>
    </View>
  );
}

function MonthDetail({ month, rows }: { month: number; rows: { label: string; values: ('serious' | 'warning' | 'good')[] }[] }) {
  const t = useTheme();
  const e = useEntrance(0);
  const risky = rows.filter((r) => r.values[month] !== 'good');
  return (
    <Animated.View style={[{ padding: 12, borderRadius: 12, backgroundColor: t.cardMuted, gap: 4 }, e]}>
      <Text variant="label" weight="700">
        {MONTHS[month]}
      </Text>
      <Text variant="caption" tone="secondary">
        {risky.length ? risky.map((r) => `${r.label}: ${LEVEL_WORD[r.values[month]].toLowerCase()}`).join(' · ') : 'A quiet month: no big weather risks in most years.'}
      </Text>
    </Animated.View>
  );
}

function AlertItem({ index, children }: { index: number; children: React.ReactNode }) {
  const e = useEntrance(index);
  return (
    <Animated.View layout={LinearTransition.duration(DURATION.state)} style={e}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', gap: 3, borderRadius: 6, overflow: 'hidden' },
});
