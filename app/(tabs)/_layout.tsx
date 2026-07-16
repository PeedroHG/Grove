import { Tabs } from 'expo-router';

/**
 * The tab bar is hidden — navigation happens through the quick actions on the
 * home header, with a back button on each spoke screen (see BackButton). The
 * Tabs navigator is kept (rather than restructured into a stack) so the
 * existing routes and deep links keep working unchanged.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="metas" />
      <Tabs.Screen name="relatorios" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}
