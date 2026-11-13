import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FactRow, type FactKind } from '@/components/field-facts';
import { Button, OptionCard, ProgressBar } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEntrance } from '@/lib/motion';
import { useOnboarding } from '@/lib/onboarding';
import { QUESTIONS } from '@/lib/questions';

/** NASA context shown with some questions, so the farmer answers with their area's data in view. */
const CONTEXT: Record<string, FactKind[]> = {
  rabi_crop: ['green', 'dry'],
  yield: ['green'],
  land_type: ['monsoon'],
  flood: ['monsoon', 'rain'],
  drainage: ['rain'],
  irrigation: ['dry', 'soil'],
  water_cost: ['dry'],
  problems: ['heat', 'cold'],
  priorities: ['future'],
};

/** One question per page, big answer cards, auto-advance for single answers. */
export function QuestionsStep() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer } = useOnboarding();
  const [i, setI] = useState(0);
  const q = QUESTIONS[i];
  const value = answers[q.id];
  const picked = Array.isArray(value) ? value : value ? [value] : [];

  const next = () => (i < QUESTIONS.length - 1 ? setI(i + 1) : router.push('/onboarding/analysing'));
  const back = () => (i > 0 ? setI(i - 1) : router.back());

  const choose = (v: string) => {
    if (q.multi) {
      let list = picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
      if (v === 'none') list = picked.includes('none') ? [] : ['none'];
      else list = list.filter((x) => x !== 'none');
      if (q.max && list.length > q.max) list = list.slice(list.length - q.max);
      setAnswer(q.id, list);
    } else {
      setAnswer(q.id, v);
      setTimeout(next, 260); // let the selection animation show
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.inner}>
        <View style={styles.head}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={10} style={[styles.back, { backgroundColor: t.card, borderColor: t.border }]}>
            <Icon name="back" size={20} color={t.text} />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="overline" tone="brand">
                Step 2 of 3 · {q.section}
              </Text>
              <Text variant="caption" tone="secondary">
                {i + 1} of {QUESTIONS.length}
              </Text>
            </View>
            <ProgressBar progress={1 / 3 + ((i + 1) / QUESTIONS.length) * (1 / 3)} />
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16, paddingBottom: 140 }}>
        <QuestionBody key={q.id}>
          <Text variant="display" style={{ fontSize: 26, lineHeight: 32 }}>
            {q.title}
          </Text>
          {q.help ? (
            <Text variant="body" tone="secondary">
              {q.help}
            </Text>
          ) : null}
          {CONTEXT[q.id] ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text variant="overline" tone="secondary">
                Your area · NASA data
              </Text>
              <FactRow kinds={CONTEXT[q.id]} compact startIndex={1} />
            </View>
          ) : null}
          <View style={{ gap: 10, marginTop: 8 }}>
            {q.options.map((o) => (
              <OptionCard key={o.value} label={o.label} hint={o.hint} icon={o.icon} multi={q.multi} selected={picked.includes(o.value)} onPress={() => choose(o.value)} />
            ))}
          </View>
        </QuestionBody>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: t.background, borderTopColor: t.border }]}>
        <View style={[styles.inner, { flexDirection: 'row', gap: 10 }]}>
          <Button label="Skip" kind="ghost" onPress={next} style={{ flex: 1 }} />
          <Button label={i === QUESTIONS.length - 1 ? 'See my advice' : 'Next'} icon="arrow" disabled={q.multi ? false : !picked.length} onPress={next} style={{ flex: 2 }} />
        </View>
      </View>
    </View>
  );
}

function QuestionBody({ children }: { children: React.ReactNode }) {
  const entrance = useEntrance(0);
  return <Animated.View style={[{ width: '100%', maxWidth: MaxContentWidth, gap: 8, marginTop: 20 }, entrance]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
});
