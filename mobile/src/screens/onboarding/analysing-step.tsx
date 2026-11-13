import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FieldOutline } from '@/components/field-outline';
import { FactTile } from '@/components/field-facts';
import { ProgressBar, Skeleton, Spinner } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { areaText, polygonArea } from '@/lib/geo';
import { useEntrance } from '@/lib/motion';
import { useOnboarding } from '@/lib/onboarding';
import { useProfile } from '@/lib/profile';

const STEPS = [
  'Finding your field',
  'Reading 30 years of rain and heat (NASA POWER)',
  'Looking at crop health from space (NASA MODIS)',
  'Testing crops against future climates (NASA models)',
  'Writing your advice',
];

/** Step 3: an honest progress screen while the advice is put together. */
export function AnalysingStep() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { points, answers, fieldName } = useOnboarding();
  const { saveProfile } = useProfile();
  const [done, setDone] = useState(0);
  const saved = useRef(false);

  useEffect(() => {
    if (done < STEPS.length) {
      const id = setTimeout(() => setDone((d) => d + 1), 750);
      return () => clearTimeout(id);
    }
    const id = setTimeout(async () => {
      if (saved.current) return;
      saved.current = true;
      await saveProfile(points, answers, fieldName || undefined);
      router.replace('/');
    }, 500);
    return () => clearTimeout(id);
  }, [done, points, answers, fieldName, saveProfile]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={[styles.screen, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.inner}>
        <Reveal index={0}>
          <Text variant="overline" tone="brand">
            Step 3 of 3
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Checking your field
          </Text>
        </Reveal>
        <Reveal index={1}>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <FieldOutline points={points} height={110} />
            <Text variant="label" weight="600" style={{ textAlign: 'center' }}>
              {areaText(polygonArea(points))}
            </Text>
          </View>
        </Reveal>
        <ProgressBar progress={Math.min(done / STEPS.length, 1)} />
        <View style={{ gap: 14, marginTop: 8 }}>
          {STEPS.map((s, i) => (
            <Row key={s} text={s} state={i < done ? 'done' : i === done ? 'busy' : 'wait'} />
          ))}
        </View>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>{done >= 2 ? <FactTile kind="rain" compact /> : <Placeholder />}</View>
            <View style={{ flex: 1 }}>{done >= 2 ? <FactTile kind="heat" index={1} compact /> : <Placeholder />}</View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>{done >= 3 ? <FactTile kind="green" compact /> : <Placeholder />}</View>
            <View style={{ flex: 1 }}>{done >= 4 ? <FactTile kind="future" compact /> : <Placeholder />}</View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Placeholder() {
  return <Skeleton height={96} radius={14} />;
}

function Row({ text, state }: { text: string; state: 'done' | 'busy' | 'wait' }) {
  const t = useTheme();
  const pop = useEntrance(0, 'fade');
  return (
    <View style={styles.row}>
      <View style={{ width: 28, alignItems: 'center' }}>
        {state === 'busy' ? (
          <Spinner size={22} />
        ) : state === 'done' ? (
          <Animated.View key="done" style={[styles.done, { backgroundColor: t.status.good }, pop]}>
            <Icon name="check" size={16} color="#fff" />
          </Animated.View>
        ) : (
          <View style={[styles.wait, { borderColor: t.border }]} />
        )}
      </View>
      <Text variant="body" weight={state === 'busy' ? '700' : '500'} tone={state === 'wait' ? 'muted' : 'primary'} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16 },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: 18 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  done: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wait: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
});
