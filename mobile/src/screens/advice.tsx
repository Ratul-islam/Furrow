import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { HBars } from '@/components/charts/hbar';
import { CompareBars, GrowBar } from '@/components/charts/mini';
import { RangePlot } from '@/components/charts/range-plot';
import { DataSourcePill } from '@/components/data-source-pill';
import { FamilyLegend, RotationStrip } from '@/components/rotation-strip';
import { router } from 'expo-router';

import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { nutrientTips, soilPicture } from '@/lib/advisor';
import { useProfile } from '@/lib/profile';
import { Card, CardHeader, Divider, SourceNote } from '@/components/ui/card';
import { Screen, Section } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';
import { CRITERIA, type Criterion } from '@/lib/engine';
import { bdt, whole } from '@/lib/format';
import { DURATION, EASE_IN_OUT, useEntrance } from '@/lib/motion';

const LEVELS = [
  { value: '0', label: 'Not' },
  { value: '1', label: 'A little' },
  { value: '2', label: 'Yes' },
  { value: '3', label: 'Very' },
];

/** Crop sequence written the way a farmer says it. */
const seq = (name: string) => name.replaceAll(' – ', ' → ');

/** Worst-case regret in plain words. */
function risk(regret: number): { word: string; level: 'good' | 'warning' | 'serious' } {
  if (regret < 8) return { word: 'Low', level: 'good' };
  if (regret < 20) return { word: 'Medium', level: 'warning' };
  return { word: 'High', level: 'serious' };
}

const reflow = LinearTransition.duration(DURATION.bar).easing(EASE_IN_OUT);

export function Advice() {
  const t = useTheme();
  const { evaluation, weights, setWeights } = useData();
  const { profile } = useProfile();
  const { results, recommended: rec, current: cur, futures, cropIndex, blocked } = evaluation;
  const tips = nutrientTips(profile?.answers ?? null, rec.rotation, cropIndex);
  const soil = soilPicture(profile?.answers ?? null);
  const [crit, setCrit] = useState<Criterion>('water');
  const runnerUp = results[1];
  const swap = useEntrance(0, 'fade');
  const critColor: Record<Criterion, string> = { climate: t.series[1], water: t.series[0], soil: t.series[2], income: t.series[3] };

  return (
    <Screen title="Advice" subtitle="For your field" right={<DataSourcePill />}>
      <Card tone="brand">
        <Animated.View key={rec.rotation.id} style={swap}>
          <Text variant="overline" tone="brand">
            Our advice
          </Text>
          <Text variant="title" style={{ marginTop: 4 }}>
            {seq(rec.rotation.name)}
          </Text>
          <View style={{ height: 12 }} />
          <RotationStrip rotation={rec.rotation} crops={cropIndex} showMonths />
          <View style={[styles.why, { backgroundColor: t.card }]}>
            <View style={styles.whyRow}>
              <Text variant="label" weight="700">
                Risk in a bad year
              </Text>
              <Badge kind={risk(rec.worstRegret).level} label={risk(rec.worstRegret).word} />
            </View>
            <GrowBar fraction={Math.max(rec.worstRegret, 1) / Math.max(...results.map((r) => r.worstRegret), 1)} color={t.status[risk(rec.worstRegret).level]} height={8} />
            <Text variant="caption" weight="600" tone="secondary" style={{ marginTop: 6 }}>
              Safest in all {futures.length} climate futures{runnerUp ? ` · Next best: ${seq(runnerUp.rotation.name)}` : ''}
            </Text>
          </View>
        </Animated.View>
      </Card>

      <Section title="Feed your soil">
        <Card>
          <CardHeader title="Your soil today" subtitle="From your answers. A soil test will make this exact." />
          <View style={{ gap: 12 }}>
            {soil.map((b, i) => (
              <View key={b.label} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="label" weight="600" style={{ flex: 1 }}>
                    {b.label}
                  </Text>
                  <Text variant="label" weight="700" style={{ color: b.value < 40 ? t.status.serious : b.value < 65 ? t.demo : t.status.good }}>
                    {b.value < 40 ? 'Low' : b.value < 65 ? 'Medium' : 'Good'}
                  </Text>
                </View>
                <GrowBar fraction={b.value / 100} color={b.value < 40 ? t.status.serious : b.value < 65 ? t.status.warning : t.status.good} height={10} delay={i * 100} />
              </View>
            ))}
          </View>
        </Card>
        {tips.map((tip) => (
          <Card key={tip.id}>
            <View style={styles.tipHead}>
              <View style={[styles.tipIcon, { backgroundColor: t.status[tip.level] + '26' }]}>
                <Icon name={tip.icon} size={18} color={t.status[tip.level]} />
              </View>
              <Text variant="heading" style={{ flex: 1 }}>
                {tip.title}
              </Text>
              <Badge kind={tip.level} label={tip.level === 'serious' ? 'Do first' : tip.level === 'warning' ? 'Do soon' : 'Good news'} />
            </View>

            {tip.improves ? (
              <View style={{ marginTop: 10, gap: 4 }}>
                <Text variant="caption" weight="600" tone="secondary">
                  Improves: {soil[tip.improves.bar].label.split(' (')[0]}
                </Text>
                <CompareBars
                  max={100}
                  items={[
                    { label: 'Now', value: soil[tip.improves.bar].value, color: t.axis },
                    { label: 'After this', value: Math.min(95, soil[tip.improves.bar].value + tip.improves.gain), color: t.status.good },
                  ]}
                  format={(v) => (v < 40 ? 'Low' : v < 65 ? 'Medium' : 'Good')}
                />
              </View>
            ) : null}
            <View style={[styles.how, { backgroundColor: t.brandSoft }]}>
              <Icon name="bulb" size={16} color={t.brand} />
              <Text variant="label" weight="600" style={{ flex: 1 }}>
                {tip.how}
              </Text>
            </View>
          </Card>
        ))}
        <SourceNote>General guidance from Bangladesh&apos;s Fertilizer Recommendation Guide 2018 (BARC). Exact doses depend on your soil test.</SourceNote>
      </Section>

      <Card onPress={() => router.push('/plan')}>
        <View style={styles.tipHead}>
          <View style={[styles.tipIcon, { backgroundColor: t.brandSoft }]}>
            <Icon name="plan" size={18} color={t.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading">Season to-do</Text>
            <Text variant="caption" tone="secondary">
              Every job for the next 12 months, with dates
            </Text>
          </View>
          <Icon name="chevron" size={18} color={t.textMuted} />
        </View>
      </Card>

      <Card>
        <CardHeader title="What matters most to you?" subtitle="Change these and our advice changes with you" />
        <View style={{ gap: 16 }}>
          {CRITERIA.map((c) => (
            <View key={c.key} style={{ gap: 6 }}>
              <View style={styles.prioHead}>
                <View style={[styles.dot, { backgroundColor: critColor[c.key] }]} />
                <Text variant="label" weight="700">
                  {c.label}
                </Text>
              </View>

              <Segmented size="sm" value={String(weights[c.key])} onChange={(v) => setWeights({ ...weights, [c.key]: Number(v) })} options={LEVELS} />
            </View>
          ))}
        </View>
        <View style={[styles.live, { backgroundColor: t.brandSoft }]}>
          <Text variant="caption" tone="brand" weight="700">
            OUR ADVICE NOW
          </Text>
          <Animated.View key={rec.rotation.id} style={swap}>
            <Text variant="label" weight="700">
              {seq(rec.rotation.name)}
            </Text>
          </Animated.View>
        </View>
      </Card>

      <Section title="All choices, safest first">
        <Card>
          <FamilyLegend />
          <Divider />
          <View style={{ gap: 20 }}>
            {results.map((r, i) => (
              <Animated.View key={r.rotation.id} layout={reflow} style={{ gap: 8 }}>
                <View style={styles.optHead}>
                  <Text variant="label" weight="700" tone="muted" style={{ width: 18 }}>
                    {i + 1}
                  </Text>
                  <Text variant="label" weight="700" style={{ flex: 1 }}>
                    {seq(r.rotation.name)}
                  </Text>
                  {r.rotation.is_current ? <Badge label="You grow this" /> : null}
                  {r === rec ? <Badge kind="brand" label="Best" /> : null}
                </View>
                {blocked[r.rotation.id] ? (
                  <View style={[styles.blocked, { backgroundColor: t.status.serious + '1a' }]}>
                    <Icon name="close" size={14} color={t.status.serious} />
                    <Text variant="caption" weight="600" style={{ flex: 1 }}>
                      Not for you: {blocked[r.rotation.id].toLowerCase()}
                    </Text>
                  </View>
                ) : null}
                <RotationStrip rotation={r.rotation} crops={cropIndex} compact />
                <View style={styles.crits}>
                  {CRITERIA.map((c, k) => (
                    <View key={c.key} style={{ flex: 1, gap: 3 }}>
                      <View style={styles.critLabel}>
                        <Text variant="caption" tone="secondary">
                          {c.short}
                        </Text>
                        <Text variant="caption" weight="700" style={{ fontVariant: ['tabular-nums'] }}>
                          {Math.round(r.observed.scores[c.key])}
                        </Text>
                      </View>
                      <GrowBar fraction={r.observed.scores[c.key] / 100} color={critColor[c.key]} height={6} delay={k * 40} />
                    </View>
                  ))}
                </View>
                <View style={styles.optFoot}>
                  <Text variant="caption" tone="secondary">
                    Risk in a bad year: <Text variant="caption" weight="700">{risk(r.worstRegret).word}</Text> · Irrigation {whole(r.water.observed)} mm a year
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
          <SourceNote>Longer bar = better. Scores are out of 100 for today&apos;s weather.</SourceNote>
        </Card>
      </Section>

      <Section title="Compare">
        <Card>
          <CardHeader title="How risky is each choice?" subtitle="Shorter bar = safer in a bad year" />
          <HBars
            max={Math.max(...results.map((r) => r.worstRegret), 1)}
            color={t.series[0]}
            rows={results.map((r) => ({ key: r.rotation.id, label: seq(r.rotation.name), value: Math.max(r.worstRegret, 1), display: risk(r.worstRegret).word, highlight: r === rec, color: t.status[risk(r.worstRegret).level] }))}
          />
        </Card>
        <Card>
          <CardHeader title="Compare by what matters" subtitle="Longer bar = better" />
          <Segmented<Criterion> size="sm" value={crit} onChange={setCrit} options={CRITERIA.map((c) => ({ value: c.key, label: c.short }))} />
          <View style={{ marginTop: Spacing.four }}>
            <HBars
              color={critColor[crit]}
              rows={[...results]
                .sort((a, b) => b.observed.scores[crit] - a.observed.scores[crit])
                .map((r) => ({
                  key: r.rotation.id,
                  label: seq(r.rotation.name),
                  value: r.observed.scores[crit],
                  display:
                    crit === 'water'
                      ? `${whole(r.water.observed)} mm`
                      : crit === 'income'
                        ? bdt(r.income.observed)
                        : crit === 'climate'
                          ? `${whole(r.stress.observed)} bad days`
                          : `${r.soil.score} / 100`,
                  highlight: r === rec,
                }))}
            />
          </View>
          <SourceNote>
            {crit === 'water'
              ? 'Water you pump per hectare in a year: what the crop drinks, minus the rain it gets. Paddy also loses water into the ground.'
              : crit === 'climate'
                ? 'Days that are too hot, too cold or too wet when each crop flowers, in an average year.'
                : crit === 'income'
                  ? 'Example profit per hectare after paying for irrigation. Real local prices come next.'
                  : 'Soil stays healthier when it is covered longer, when pulses like mungbean are grown, and when crops are mixed.'}
          </SourceNote>
        </Card>
        <Card>
          <CardHeader title="Water needed per year" subtitle="mm per hectare. Dot = today; bar = good to bad future years" right={<Badge kind="nasa" label="NASA" />} />
          <RangePlot
            labelWidth={132}
            animateKey={rec.rotation.id}
            rows={results.map((r) => ({
              key: r.rotation.id,
              label:
                r.rotation.slots
                  .filter((sl) => sl.crop !== 'aman')
                  .map((sl) => cropIndex[sl.crop].name.replace(' rice', '').replace(' (AWD)', ' AWD'))
                  .join(' + ') + (r.rotation.is_current ? ' (now)' : ''),
              min: r.water.min,
              max: r.water.max,
              point: r.water.observed,
              color: r === rec ? t.series[0] : r === cur ? t.series[1] : t.axis,
              emphasis: r === rec,
            }))}
            format={(v) => whole(v)}
            pointLabel="Today"
            rangeLabel="Future years"
          />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  why: { marginTop: 14, padding: 14, borderRadius: 12, gap: 6 },
  whyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  prioHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  optHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  crits: { flexDirection: 'row', gap: 10 },
  critLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  optFoot: { flexDirection: 'row' },
  live: { marginTop: 18, padding: 12, borderRadius: 12, gap: 2 },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  how: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'flex-start' },
  blocked: { flexDirection: 'row', gap: 6, padding: 8, borderRadius: 8, alignItems: 'center' },
});
