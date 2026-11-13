/**
 * Field editor: find the field, mark its corners, check and name it.
 * Used in onboarding and from Home ("Edit field").
 *
 * Map gestures live in the DOM map; this screen owns the corners, undo/redo and validation.
 */

import * as Location from 'expo-location';
import { useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FactRow } from '@/components/field-facts';
import FieldMapPicker from '@/components/field-map-picker';
import { Button, Chip, Spinner } from '@/components/ui/controls';
import { Icon, type IconName } from '@/components/ui/icon';
import { CountUp } from '@/components/ui/insight';
import { Reveal } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  AREA_UNITS,
  BIGHA_M2,
  DECIMAL_M2,
  kmBetween,
  perimeter,
  PILOT,
  polygonArea,
  selfIntersects,
  type AreaUnit,
  type LatLng,
} from '@/lib/geo';
import { QUICK_PLACES, searchPlaces, type Place } from '@/lib/geocode';
import { DURATION, EASE_IN_OUT, selectionHaptic, useEntrance } from '@/lib/motion';

type Step = 'find' | 'draw' | 'check';
const STEPS: { key: Step; label: string }[] = [
  { key: 'find', label: 'Find' },
  { key: 'draw', label: 'Mark' },
  { key: 'check', label: 'Check' },
];

const DEMO_FIELD: LatLng[] = [
  [23.88204, 90.32903],
  [23.88199, 90.32975],
  [23.88167, 90.32972],
  [23.88172, 90.32902],
];

const TIPS: Record<Step, string> = {
  find: 'Search your village, use your location, or move the map until the red pin sits on your field.',
  draw: 'Tap each corner of your field. Drag a corner to move it. Tap + to add a corner between two.',
  check: 'Check the shape and size. Give your field a name you will recognise.',
};

const reflow = LinearTransition.duration(DURATION.state).easing(EASE_IN_OUT);

export function FieldEditor({
  initialPoints = [],
  initialName = '',
  stepLabel,
  saveLabel = 'Save field',
  onSave,
  onBack,
}: {
  initialPoints?: LatLng[];
  initialName?: string;
  stepLabel?: string;
  saveLabel?: string;
  onSave: (points: LatLng[], name: string) => void;
  onBack: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(initialPoints.length >= 3 ? 'draw' : 'find');
  const [points, setPointsRaw] = useState<LatLng[]>(initialPoints);
  const [past, setPast] = useState<LatLng[][]>([]);
  const [future, setFuture] = useState<LatLng[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [center, setCenter] = useState<LatLng>(initialPoints[0] ?? PILOT_START);
  const centerRef = useRef<LatLng>(center);
  const [recenter, setRecenter] = useState(0);
  const [flyZoom, setFlyZoom] = useState(17);
  const [fitKey, setFitKey] = useState(initialPoints.length >= 3 ? 1 : 0);
  const [zoomCmd, setZoomCmd] = useState<{ dir: 1 | -1; n: number }>({ dir: 1, n: 0 });
  const [satellite, setSatellite] = useState(true);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [unit, setUnit] = useState<AreaUnit>('decimal');
  const [name, setName] = useState(initialName);

  const area = polygonArea(points);
  const per = perimeter(points);
  const crossing = useMemo(() => selfIntersects(points), [points]);
  const decimals = area / DECIMAL_M2;
  const warn =
    points.length >= 3 && crossing
      ? 'Two edges cross. Drag a corner so the shape has no twist.'
      : points.length >= 3 && decimals < 3
        ? 'This is very small. Zoom in and check the corners.'
        : points.length >= 3 && area > 30 * BIGHA_M2
          ? 'This is very large for one field. Is it right?'
          : null;
  const far = kmBetween(points[0] ?? center, PILOT.center) > PILOT.radiusKm;

  const setPoints = (next: LatLng[]) => {
    setPast((p) => [...p.slice(-30), points]);
    setFuture([]);
    setPointsRaw(next);
  };
  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [points, ...f]);
    setPointsRaw(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setSelected(null);
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, points]);
    setPointsRaw(future[0]);
    setFuture(future.slice(1));
  };

  const fly = (at: LatLng, zoom = 17) => {
    setCenter(at);
    setFlyZoom(zoom);
    setRecenter((k) => k + 1);
  };

  const locate = async () => {
    setLocating(true);
    setMessage(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setMessage('Location is turned off. Search or move the map by hand.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      fly([pos.coords.latitude, pos.coords.longitude], 18);
    } catch {
      setMessage('Could not find your location. Search or move the map by hand.');
    } finally {
      setLocating(false);
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setSearching(true);
    setMessage(null);
    try {
      const r = await searchPlaces(query.trim());
      setResults(r);
      if (!r.length) setMessage('No place found. Try the village or union name.');
    } catch {
      setMessage('Search needs internet. Move the map by hand instead.');
    } finally {
      setSearching(false);
    }
  };

  const go = (s: Step) => {
    selectionHaptic();
    setSelected(null);
    if (s === 'draw' && step === 'find') fly(centerRef.current, 18);
    if (s === 'check') setFitKey((k) => k + 1);
    setStep(s);
  };

  const mapMode = step === 'find' ? 'locate' : step === 'draw' ? 'draw' : 'review';
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a19' }}>
      <View style={StyleSheet.absoluteFill}>
        <FieldMapPicker
          mode={mapMode}
          center={center}
          points={points}
          selected={selected}
          satellite={satellite}
          recenterKey={recenter}
          flyZoom={flyZoom}
          fitKey={fitKey}
          zoomCmd={zoomCmd}
          onCenter={async (lat, lng) => {
            centerRef.current = [lat, lng];
          }}
          onAddPoint={async (lat, lng) => {
            setSelected(null);
            setPoints([...points, [lat, lng]]);
          }}
          onMovePoint={async (i, lat, lng) => setPoints(points.map((p, k) => (k === i ? [lat, lng] : p)))}
          onInsertPoint={async (i, lat, lng) => {
            setPoints([...points.slice(0, i), [lat, lng], ...points.slice(i)]);
            setSelected(i);
          }}
          onSelectPoint={async (i) => setSelected(i)}
          dom={{ style: { flex: 1 }, scrollEnabled: false } as never}
        />
      </View>

      {step === 'draw' && points.length === 0 ? <TapCoach /> : null}

      {/* top panel */}
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Reveal index={0} style={{ width: '100%', maxWidth: MaxContentWidth }}>
          <View style={[styles.panel, { backgroundColor: t.card }]}>
            <View style={styles.row}>
              <RoundButton icon="back" label="Back" onPress={() => (stepIndex > 0 ? go(STEPS[stepIndex - 1].key) : onBack())} flat />
              <View style={{ flex: 1, gap: 6 }}>
                {stepLabel ? (
                  <Text variant="overline" tone="brand">
                    {stepLabel} · Your field
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {STEPS.map((s, i) => (
                    <StepPill
                      key={s.key}
                      label={`${i + 1}. ${s.label}`}
                      state={i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'next'}
                    />
                  ))}
                </View>
              </View>
            </View>
            <Tip key={step} text={TIPS[step]} />
          </View>
        </Reveal>
        <View style={styles.side}>
          <Reveal index={2}>
            <RoundButton icon="layers" label={satellite ? 'Street map' : 'Satellite photo'} onPress={() => setSatellite((s) => !s)} />
          </Reveal>
          <Reveal index={3}>
            {locating ? (
              <View style={[styles.round, { backgroundColor: t.card }]}>
                <Spinner size={18} />
              </View>
            ) : (
              <RoundButton icon="gps" label="My location" onPress={locate} />
            )}
          </Reveal>
          <Reveal index={4}>
            <RoundButton icon="plus" label="Zoom in" onPress={() => setZoomCmd((z) => ({ dir: 1, n: z.n + 1 }))} />
          </Reveal>
          <Reveal index={5}>
            <RoundButton icon="minus" label="Zoom out" onPress={() => setZoomCmd((z) => ({ dir: -1, n: z.n + 1 }))} />
          </Reveal>
        </View>
      </View>

      {/* bottom sheet */}
      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Reveal index={3} style={{ width: '100%', maxWidth: MaxContentWidth }}>
          <Animated.View layout={reflow} style={[styles.panel, { backgroundColor: t.card }]}>
            {step === 'find' ? (
              <SheetBody key="find">
                <View style={styles.row}>
                  <View style={[styles.search, { backgroundColor: t.cardMuted, borderColor: t.border }]}>
                    <Icon name="search" size={18} color={t.textMuted} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      onSubmitEditing={search}
                      returnKeyType="search"
                      placeholder="Search village or union"
                      placeholderTextColor={t.textMuted}
                      style={[styles.searchInput, { color: t.text }]}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Search"
                    onPress={search}
                    style={[styles.searchBtn, { backgroundColor: t.brand }]}>
                    {searching ? <Spinner size={18} color="#fff" /> : <Icon name="search" size={20} color="#fff" />}
                  </Pressable>
                </View>
                {results && results.length ? (
                  <ScrollView style={{ maxHeight: 170 }} keyboardShouldPersistTaps="handled">
                    {results.map((r, i) => (
                      <PlaceRow
                        key={`${r.name}-${i}`}
                        index={i}
                        place={r}
                        onPress={() => {
                          fly(r.at, 16);
                          setResults(null);
                        }}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.chips}>
                    {QUICK_PLACES.map((p) => (
                      <Chip key={p.name} active={false} onPress={() => fly(p.at, 16)}>
                        {p.name}
                      </Chip>
                    ))}
                  </View>
                )}
                {message ? (
                  <Text variant="caption" tone="demo">
                    {message}
                  </Text>
                ) : null}
                <View style={styles.row}>
                  <Button
                    label="Demo field"
                    kind="ghost"
                    onPress={() => {
                      setPointsRaw(DEMO_FIELD);
                      setCenter(DEMO_FIELD[0]);
                      setStep('draw');
                      setFitKey((k) => k + 1);
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button label="My field is here" icon="location" onPress={() => go('draw')} style={{ flex: 1.6 }} />
                </View>
              </SheetBody>
            ) : step === 'draw' ? (
              <SheetBody key="draw">
                <View style={styles.statsRow}>
                  <View style={{ flex: 1.4 }}>
                    <Text variant="caption" tone="secondary">
                      Field size
                    </Text>
                    {points.length >= 3 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                        <CountUp value={decimals} format={(v) => `${Math.round(v)}`} style={{ fontSize: 28, lineHeight: 32 }} />
                        <Text variant="label" tone="secondary" style={{ marginBottom: 3 }}>
                          decimal
                        </Text>
                      </View>
                    ) : (
                      <Text variant="heading" style={{ marginTop: 4 }}>
                        {points.length === 0
                          ? 'Tap the first corner'
                          : `Tap ${3 - points.length} more corner${3 - points.length > 1 ? 's' : ''}`}
                      </Text>
                    )}
                  </View>
                  <Stat label="Corners" value={String(points.length)} />
                  <Stat label="Around" value={per ? `${Math.round(per)} m` : '–'} />
                </View>
                {warn ? (
                  <View style={[styles.warn, { backgroundColor: t.status.warning + '2a' }]}>
                    <Icon name="warning" size={15} color={t.demo} />
                    <Text variant="caption" weight="600" style={{ flex: 1 }}>
                      {warn}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.tools}>
                  <Tool icon="undo" label="Undo" disabled={!past.length} onPress={undo} />
                  <Tool icon="redo" label="Redo" disabled={!future.length} onPress={redo} />
                  <Tool
                    icon="trash"
                    label={selected != null ? `Delete ${selected + 1}` : 'Delete'}
                    disabled={selected == null}
                    danger
                    onPress={() => {
                      if (selected == null) return;
                      setPoints(points.filter((_, k) => k !== selected));
                      setSelected(null);
                    }}
                  />
                  <Tool
                    icon="close"
                    label="Clear"
                    disabled={!points.length}
                    onPress={() => {
                      setPoints([]);
                      setSelected(null);
                    }}
                  />
                </View>
                <Button label="Done marking" icon="check" disabled={points.length < 3 || crossing} onPress={() => go('check')} />
              </SheetBody>
            ) : (
              <SheetBody key="check">
                <Text variant="caption" tone="secondary">
                  Your field is
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <CountUp
                    value={area / AREA_UNITS.find((u) => u.unit === unit)!.m2}
                    format={(v) => v.toFixed(AREA_UNITS.find((u) => u.unit === unit)!.digits)}
                    style={{ fontSize: 34, lineHeight: 38 }}
                  />
                  <Text variant="heading" tone="secondary" style={{ marginBottom: 4 }}>
                    {unit}
                  </Text>
                </View>
                <Text variant="overline" tone="secondary">
                  About this spot · NASA data
                </Text>
                <FactRow kinds={['rain', 'heat', 'green']} compact />
                <View style={styles.chips}>
                  {AREA_UNITS.map((u) => (
                    <Chip key={u.unit} active={unit === u.unit} onPress={() => setUnit(u.unit)}>
                      {u.label}
                    </Chip>
                  ))}
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name your field (e.g. Canal-side plot)"
                  placeholderTextColor={t.textMuted}
                  maxLength={40}
                  style={[styles.nameInput, { color: t.text, borderColor: t.border, backgroundColor: t.cardMuted }]}
                />
                {far ? (
                  <Text variant="caption" tone="demo">
                    This field is outside the {PILOT.name} pilot area; we use the nearest pilot data for now.
                  </Text>
                ) : null}
                <View style={styles.row}>
                  <Button label="Edit" icon="edit" kind="ghost" onPress={() => go('draw')} style={{ flex: 1 }} />
                  <Button label={saveLabel} icon="check" onPress={() => onSave(points, name.trim())} style={{ flex: 1.4 }} />
                </View>
              </SheetBody>
            )}
          </Animated.View>
        </Reveal>
      </View>
    </View>
  );
}

const PILOT_START: LatLng = [23.8812, 90.3302];

function SheetBody({ children }: { children: React.ReactNode }) {
  const e = useEntrance(0);
  return <Animated.View style={[{ gap: 12 }, e]}>{children}</Animated.View>;
}

function Tip({ text }: { text: string }) {
  const e = useEntrance(0, 'fade');
  return (
    <Animated.View style={e}>
      <Text variant="caption" tone="secondary">
        {text}
      </Text>
    </Animated.View>
  );
}

function StepPill({ label, state }: { label: string; state: 'done' | 'now' | 'next' }) {
  const t = useTheme();
  const bg = state === 'now' ? t.brand : state === 'done' ? t.brandSoft : t.cardMuted;
  const fg = state === 'now' ? '#fff' : state === 'done' ? t.brandInk : t.textMuted;
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          flex: state === 'now' ? 1.4 : 1,
          transitionProperty: ['backgroundColor', 'flex'],
          transitionDuration: `${DURATION.state}ms`,
        } as object,
      ]}>
      {state === 'done' ? <Icon name="check" size={12} color={fg} /> : null}
      <Text variant="caption" weight="700" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PlaceRow({ place, index, onPress }: { place: Place; index: number; onPress: () => void }) {
  const t = useTheme();
  const e = useEntrance(index);
  return (
    <Animated.View style={e}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.place, { borderBottomColor: t.border, opacity: pressed ? 0.6 : 1 }]}>
        <Icon name="location" size={18} color={t.brand} />
        <View style={{ flex: 1 }}>
          <Text variant="label" weight="700">
            {place.name}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {place.detail}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="heading" style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

function Tool({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const t = useTheme();
  const c = danger && !disabled ? t.status.critical : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      <View style={[styles.toolIcon, { backgroundColor: t.cardMuted }]}>
        <Icon name={icon} size={18} color={c} />
      </View>
      <Text variant="caption" weight="600" style={{ color: c }}>
        {label}
      </Text>
    </Pressable>
  );
}

function RoundButton({ icon, label, onPress, flat }: { icon: IconName; label: string; onPress: () => void; flat?: boolean }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}>
      <View style={[styles.round, { backgroundColor: flat ? t.cardMuted : t.card }, flat && { shadowOpacity: 0, elevation: 0 }]}>
        <Icon name={icon} size={20} color={t.text} />
      </View>
    </Pressable>
  );
}

const RING = { from: { transform: [{ scale: 0.5 }], opacity: 0.9 }, to: { transform: [{ scale: 1.8 }], opacity: 0 } };

/** Animated "tap here" hint until the first corner is placed. */
function TapCoach() {
  const t = useTheme();
  const reduced = useReducedMotion();
  return (
    <View pointerEvents="none" style={styles.coach}>
      <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
        {!reduced ? (
          <Animated.View
            style={[
              styles.ring,
              { borderColor: '#fff' },
              {
                animationName: RING,
                animationDuration: '1400ms',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-out',
              },
            ]}
          />
        ) : null}
        <View style={[styles.coachDot, { backgroundColor: t.brand }]}>
          <Icon name="tap" size={22} color="#fff" />
        </View>
      </View>
      <View style={[styles.coachLabel, { backgroundColor: 'rgba(15,16,14,0.82)' }]}>
        <Text variant="label" weight="700" style={{ color: '#fff' }}>
          Tap the first corner
        </Text>
      </View>
    </View>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 };

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 10, alignItems: 'center' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, alignItems: 'center' },
  panel: { width: '100%', maxWidth: MaxContentWidth, borderRadius: 20, padding: 14, gap: 10, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  side: { alignSelf: 'flex-end', gap: 10, maxWidth: MaxContentWidth },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pill: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 999,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  searchBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  statsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  warn: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, alignItems: 'center' },
  tools: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: { alignItems: 'center', gap: 4, minWidth: 64, paddingVertical: 2 },
  toolIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nameInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 50 },
  coach: { position: 'absolute', left: 0, right: 0, top: '42%', alignItems: 'center', gap: 6 },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 3 },
  coachDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  coachLabel: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
