import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniBars } from '@/components/charts/mini';
import { Button } from '@/components/ui/controls';
import { Icon, type IconName } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useData } from '@/lib/data-context';

const FLOAT = { from: { transform: [{ translateY: 0 }, { scale: 1 }] }, to: { transform: [{ translateY: -8 }, { scale: 1.04 }] } };

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'map', title: 'Mark your field on the map', text: 'Tap its corners on a satellite photo.' },
  { icon: 'user', title: 'Answer a few questions', text: 'About your crops, land, water and soil.' },
  { icon: 'bulb', title: 'Get advice for your field', text: 'What to grow, how to feed the soil, when to plant.' },
  { icon: 'warning', title: 'Get warnings in time', text: 'Flood, heavy rain, heat, drought and cold.' },
  { icon: 'drone', title: 'Call our drone team', text: 'We fly over your field and check it closely.' },
];

export function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { bundle } = useData();
  return (
    <View style={[styles.screen, { backgroundColor: t.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.inner}>
        <Reveal index={0}>
          <View style={styles.hero}>
            <Animated.View
              style={[
                styles.logo,
                { backgroundColor: t.brand },
                reduced ? null : { animationName: FLOAT, animationDuration: '1800ms', animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' },
              ]}>
              <Icon name="sprout" size={44} color="#fff" />
            </Animated.View>
            <Text variant="display" style={{ textAlign: 'center', fontSize: 32, lineHeight: 38 }}>
              Furrow
            </Text>
            <Text variant="body" tone="secondary" style={{ textAlign: 'center', fontSize: 17, lineHeight: 24 }}>
              Farm advice from NASA satellites, made for your own field.
            </Text>
          </View>
        </Reveal>
        <Reveal index={1}>
          <View style={[styles.preview, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text variant="caption" weight="700" tone="secondary">
              30 years of rain at Ashulia · NASA POWER
            </Text>
            <MiniBars values={bundle.climate_annual.map((y) => y.rain_mm)} highlight={[bundle.climate_annual.length - 1]} accent={t.brand} color={t.series[0]} height={44} />
          </View>
        </Reveal>

        <View style={{ gap: 10, marginTop: 18 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.title} index={i + 2}>
              <View style={[styles.step, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={[styles.stepIcon, { backgroundColor: t.brandSoft }]}>
                  <Icon name={s.icon} size={20} color={t.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="heading">{s.title}</Text>
                  <Text variant="caption" tone="secondary">
                    {s.text}
                  </Text>
                </View>
              </View>
            </Reveal>
          ))}
        </View>
      </View>

      <Reveal index={7}>
        <View style={[styles.inner, { gap: 8 }]}>
          <Button label="Start" icon="arrow" onPress={() => router.push('/onboarding/field')} />
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            Takes about 3 minutes. Your answers stay on your phone.
          </Text>
        </View>
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, justifyContent: 'space-between', alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth },
  hero: { alignItems: 'center', gap: 10 },
  logo: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  step: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  preview: { marginTop: 18, padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  stepIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
