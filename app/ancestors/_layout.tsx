import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';

/**
 * 长辈模块路由布局
 * 包含列表页、新建页、详情页、AI识别页
 */
export default function AncestorsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.paper },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="new"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: '添加长辈',
          headerStyle: { backgroundColor: Colors.paper },
          headerTintColor: Colors.ink,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="scan"
        options={{
          presentation: 'modal',
          headerShown: false,
          title: 'AI 识别族谱',
        }}
      />
    </Stack>
  );
}
