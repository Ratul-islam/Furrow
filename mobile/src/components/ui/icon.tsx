import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

/** One name per concept, mapped to SF Symbols (iOS) and Material Symbols (Android, web). */
const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  climate: { ios: 'thermometer.sun.fill', android: 'thermostat' },
  drone: { ios: 'airplane', android: 'flight' },
  rotation: { ios: 'arrow.triangle.2.circlepath', android: 'autorenew' },
  plan: { ios: 'calendar', android: 'calendar_month' },
  satellite: { ios: 'globe.asia.australia.fill', android: 'satellite_alt' },
  water: { ios: 'drop.fill', android: 'water_drop' },
  leaf: { ios: 'leaf.fill', android: 'eco' },
  sprout: { ios: 'camera.macro', android: 'grass' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  info: { ios: 'info.circle', android: 'info' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on' },
  database: { ios: 'cylinder.split.1x2', android: 'database' },
  offline: { ios: 'icloud.slash', android: 'cloud_off' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  trendUp: { ios: 'arrow.up.right', android: 'trending_up' },
  trendDown: { ios: 'arrow.down.right', android: 'trending_down' },
  balance: { ios: 'scalemass', android: 'balance' },
  tune: { ios: 'slider.horizontal.3', android: 'tune' },
  book: { ios: 'book.closed', android: 'menu_book' },
  grid: { ios: 'square.grid.3x3', android: 'grid_on' },
  sun: { ios: 'sun.max.fill', android: 'partly_cloudy_day' },
  schedule: { ios: 'clock', android: 'schedule' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward' },
  close: { ios: 'xmark', android: 'close' },
  science: { ios: 'flask', android: 'science' },
  harvest: { ios: 'basket.fill', android: 'agriculture' },
  bulb: { ios: 'lightbulb.fill', android: 'lightbulb' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  phone: { ios: 'phone.fill', android: 'call' },
  map: { ios: 'map.fill', android: 'map' },
  layers: { ios: 'square.3.layers.3d', android: 'layers' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo' },
  gps: { ios: 'location.fill', android: 'my_location' },
  flood: { ios: 'water.waves', android: 'flood' },
  rain: { ios: 'cloud.heavyrain.fill', android: 'rainy' },
  cold: { ios: 'snowflake', android: 'ac_unit' },
  bug: { ios: 'ant.fill', android: 'pest_control' },
  dry: { ios: 'sun.dust.fill', android: 'wb_sunny' },
  user: { ios: 'person.crop.circle', android: 'account_circle' },
  back: { ios: 'chevron.left', android: 'chevron_left' },
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  tap: { ios: 'hand.tap.fill', android: 'touch_app' },
  search: { ios: 'magnifyingglass', android: 'search' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  redo: { ios: 'arrow.uturn.forward', android: 'redo' },
  trash: { ios: 'trash', android: 'delete' },
  edit: { ios: 'pencil', android: 'edit' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause' },
} as const;

export type IconName = keyof typeof ICONS;

type Props = Omit<ComponentProps<typeof SymbolView>, 'name'> & { name: IconName; color?: string };

export function Icon({ name, color, size = 18, ...rest }: Props) {
  const n = ICONS[name];
  return (
    <SymbolView
      {...rest}
      size={size}
      tintColor={color}
      name={{ ios: n.ios as never, android: n.android as never, web: n.android as never }}
    />
  );
}
