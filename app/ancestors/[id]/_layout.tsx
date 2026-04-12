import { Stack } from 'expo-router';
import { Colors } from '../../../src/constants/colors';

/**
 * 长辈详情页路由布局
 * 包含详情页和定位确认页（modal）
 */
export default function AncestorDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.paper },
        headerTintColor: Colors.ink,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="confirm-location"
        options={{
          presentation: 'modal',
          title: '确认墓址位置',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="interview"
        options={{
          title: '访谈记录',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="skill-preview"
        options={{
          title: '人格档案',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
