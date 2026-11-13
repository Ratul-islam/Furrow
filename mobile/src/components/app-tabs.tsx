import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

/** Native tab bar on iOS and Android (Liquid Glass on iOS 26+). */
export default function AppTabs() {
  const t = useTheme();
  return (
    <NativeTabs tintColor={t.brand} labelStyle={{ selected: { color: t.brand } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts">
        <NativeTabs.Trigger.Label>Alerts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="exclamationmark.triangle.fill" md="warning" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="advice">
        <NativeTabs.Trigger.Label>Advice</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="lightbulb.fill" md="lightbulb" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="drone">
        <NativeTabs.Trigger.Label>Drone</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="airplane" md="flight" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
