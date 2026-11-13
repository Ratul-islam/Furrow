import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { monthsOf } from '@/lib/engine';
import { MONTH_INITIALS } from '@/lib/format';
import type { Crop, CropFamily, Rotation } from '@/lib/types';

/** Season order used throughout: the farm year starts in November (after Aman). */
export const SEASON_MONTHS = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** 12-month calendar strip for one rotation, coloured by crop family, labelled by crop. */
export function RotationStrip({ rotation, crops, showMonths = false, compact = false }: { rotation: Rotation; crops: Record<string, Crop>; showMonths?: boolean; compact?: boolean }) {
  const t = useTheme();
  const cell = SEASON_MONTHS.map((m) => {
    const slot = rotation.slots.find((s) => monthsOf(s).includes(m));
    return slot ? crops[slot.crop] : null;
  });
  // merge consecutive months of the same crop into blocks
  const blocks: { crop: Crop | null; span: number }[] = [];
  cell.forEach((c) => {
    const last = blocks[blocks.length - 1];
    if (last && last.crop?.id === c?.id) last.span += 1;
    else blocks.push({ crop: c, span: 1 });
  });
  const h = compact ? 22 : 30;
  return (
    <View style={{ gap: 4 }}>
      <View style={[styles.strip, { height: h }]}>
        {blocks.map((b, i) => {
          const bg = b.crop ? t.family[b.crop.family as CropFamily] : t.family.fallow;
          return (
            <View key={i} style={[styles.block, { flex: b.span, backgroundColor: bg }]}>
              <Text variant="caption" weight="600" numberOfLines={1} style={{ color: b.crop ? '#1d1c18' : t.textMuted, fontSize: compact ? 10 : 11 }}>
                {b.crop ? (b.span >= 2 || !compact ? shortName(b.crop.name) : '') : b.span >= 2 ? 'Fallow' : ''}
              </Text>
            </View>
          );
        })}
      </View>
      {showMonths ? (
        <View style={styles.months}>
          {SEASON_MONTHS.map((m) => (
            <Text key={m} variant="caption" tone="muted" style={{ flex: 1, textAlign: 'center', fontSize: 10 }}>
              {MONTH_INITIALS[m - 1]}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function shortName(n: string) {
  return n.replace(' rice', '').replace(' (AWD)', ' AWD');
}

export function FamilyLegend() {
  const t = useTheme();
  const items: [string, string][] = [
    ['Rice / cereal', t.family.cereal],
    ['Legume', t.family.legume],
    ['Oilseed', t.family.oilseed],
    ['Fallow', t.family.fallow],
  ];
  return (
    <View style={styles.legend}>
      {items.map(([l, c]) => (
        <View key={l} style={styles.legendItem}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} />
          <Text variant="caption" tone="secondary">
            {l}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 2, borderRadius: 8, overflow: 'hidden' },
  block: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  months: { flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
