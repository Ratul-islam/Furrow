import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FieldMap } from '@/components/charts/field-map';
import { Card, CardHeader } from '@/components/ui/card';
import { Button, Chip, OptionCard } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Reveal } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MONTHS } from '@/lib/format';
import { areaText } from '@/lib/geo';
import { useEntrance } from '@/lib/motion';
import { useData } from '@/lib/data-context';
import { useProfile } from '@/lib/profile';

export const DRONE_TEAM_PHONE = process.env.EXPO_PUBLIC_DRONE_TEAM_PHONE ?? '';

const CHECKS = [
  { value: 'health', label: 'Crop health map', hint: 'See weak and strong parts of the field', icon: 'sprout' as const },
  { value: 'water', label: 'Wet and dry spots', hint: 'Find where water stands or soil is dry', icon: 'water' as const },
  { value: 'soil', label: 'Soil samples tested', hint: 'We take soil and test the nutrients', icon: 'science' as const },
  { value: 'pests', label: 'Insects and disease', hint: 'Close photos of problem patches', icon: 'bug' as const },
];

function nextDays(n: number) {
  const out: { iso: string; label: string }[] = [];
  const d = new Date();
  for (let i = 2; i < 2 + n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    out.push({ iso: `${x.getDate()} ${MONTHS[x.getMonth()]}`, label: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x.getDay()]} ${x.getDate()}` });
  }
  return out;
}

export function DroneRequest() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, requestDrone } = useProfile();
  const { bundle } = useData();
  const flight = bundle.drone_flights[bundle.drone_flights.length - 1];
  const zones = bundle.drone_zones.filter((z) => z.flight_id === flight.id);
  const days = nextDays(5);
  const [checks, setChecks] = useState<string[]>(['health', 'soil']);
  const [date, setDate] = useState(days[0].iso);
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const phoneOk = /^01\d{9}$/.test(phone.replace(/\D/g, ''));

  const submit = async () => {
    setSending(true);
    await requestDrone({ checks, date, phone: phone.replace(/\D/g, ''), note });
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 700);
  };

  if (sent) return <Sent date={date} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.inner}>
        <Reveal index={0}>
          <Card tone="brand">
            <View style={styles.row}>
              <View style={[styles.bigIcon, { backgroundColor: t.brand }]}>
                <Icon name="drone" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="heading">Our team comes to your field</Text>
                <Text variant="caption" tone="secondary">
                  A drone flies over {profile ? areaText(profile.field.areaM2) : 'your field'} in about 15 minutes. You get a full report in the app.
                </Text>
              </View>
            </View>
          </Card>
        </Reveal>

        <Reveal index={1}>
          <Card>
            <CardHeader title="What you get" subtitle="Example report: crop cover in 5 m squares, weak spots marked" />
            <FieldMap flight={flight} zones={zones} />
          </Card>
        </Reveal>

        <Reveal index={2}>
          <Text variant="overline" tone="secondary" style={styles.label}>
            What should we check?
          </Text>
          <View style={{ gap: 10 }}>
            {CHECKS.map((c) => (
              <OptionCard
                key={c.value}
                multi
                label={c.label}
                hint={c.hint}
                icon={c.icon}
                selected={checks.includes(c.value)}
                onPress={() => setChecks(checks.includes(c.value) ? checks.filter((x) => x !== c.value) : [...checks, c.value])}
              />
            ))}
          </View>
        </Reveal>

        <Reveal index={3}>
          <Text variant="overline" tone="secondary" style={styles.label}>
            Which day suits you?
          </Text>
          <View style={styles.chips}>
            {days.map((d) => (
              <Chip key={d.iso} active={date === d.iso} onPress={() => setDate(d.iso)}>
                {d.label}
              </Chip>
            ))}
          </View>
        </Reveal>

        <Reveal index={4}>
          <Card>
            <CardHeader title="Your phone number" subtitle="So the team can call you before they come" />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="01XXXXXXXXX"
              placeholderTextColor={t.textMuted}
              keyboardType="phone-pad"
              maxLength={14}
              style={[styles.input, { color: t.text, borderColor: phone && !phoneOk ? t.status.serious : t.border, backgroundColor: t.cardMuted }]}
            />
            {phone && !phoneOk ? (
              <Text variant="caption" style={{ color: t.status.critical, marginTop: 6 }}>
                Please enter an 11-digit number starting with 01.
              </Text>
            ) : null}
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Anything we should know? (optional)"
              placeholderTextColor={t.textMuted}
              multiline
              style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.cardMuted, minHeight: 80, marginTop: 10, textAlignVertical: 'top' }]}
            />
          </Card>
        </Reveal>

        <Reveal index={5}>
          <View style={{ gap: 10 }}>
            <Button label="Send request" icon="drone" loading={sending} disabled={!phoneOk || !checks.length} onPress={submit} />
            {DRONE_TEAM_PHONE ? (
              <Button label="Or call the team now" icon="phone" kind="ghost" onPress={() => Linking.openURL(`tel:${DRONE_TEAM_PHONE}`)} />
            ) : null}
          </View>
        </Reveal>
      </View>
    </ScrollView>
  );
}

const POP = { from: { opacity: 0, transform: [{ scale: 0.6 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } };

function Sent({ date }: { date: string }) {
  const t = useTheme();
  const fade = useEntrance(2);
  return (
    <View style={[styles.sent, { backgroundColor: t.background }]}>
      <Animated.View style={[styles.check, { backgroundColor: t.status.good }, { animationName: POP, animationDuration: '420ms', animationTimingFunction: 'ease-out' }]}>
        <Icon name="check" size={44} color="#fff" />
      </Animated.View>
      <Animated.View style={[{ alignItems: 'center', gap: 8 }, fade]}>
        <Text variant="display" style={{ textAlign: 'center' }}>
          Request sent
        </Text>
        <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 320 }}>
          Our team will call you to confirm the flight on {date}. You can follow it in the Drone tab.
        </Text>
      </Animated.View>
      <Animated.View style={[{ width: '100%', maxWidth: 360 }, fade]}>
        <Button label="Done" icon="check" onPress={() => router.replace('/drone')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { marginBottom: 10, paddingHorizontal: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, minHeight: 50 },
  sent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 },
  check: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
