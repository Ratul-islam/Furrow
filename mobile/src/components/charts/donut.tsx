import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useCountUp } from '@/lib/motion';

const SPIN_IN = {
  from: { opacity: 0, transform: [{ rotate: '-120deg' }, { scale: 0.8 }] },
  to: { opacity: 1, transform: [{ rotate: '0deg' }, { scale: 1 }] },
};

/** A ring that fills to `value`% with the number in bold in the middle. Spins in; the number counts up. */
export function Donut({ value, color, size = 76, stroke = 9, label }: { value: number; color: string; size?: number; stroke?: number; label?: string }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const v = Math.max(0, Math.min(100, value));
  const n = useCountUp(v);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, alignItems: 'center', gap: 2 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            { position: 'absolute', width: size, height: size },
            reduced ? null : { animationName: SPIN_IN, animationDuration: '650ms', animationTimingFunction: 'ease-out', animationFillMode: 'backwards' },
          ]}>
          <Svg width={size} height={size}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.cardMuted} strokeWidth={stroke} fill="none" />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(c * v) / 100} ${c}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </Animated.View>
        <Text variant="number" style={{ fontSize: size * 0.27, lineHeight: size * 0.32, fontWeight: '800' }}>
          {Math.round(n)}%
        </Text>
      </View>
      {label ? (
        <Text variant="caption" tone="secondary" style={{ textAlign: 'center', fontSize: 11, lineHeight: 13 }} numberOfLines={2}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
