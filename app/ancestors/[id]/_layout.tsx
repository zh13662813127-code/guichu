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
        name="distill"
        options={{
          title: '蒸馏人格',
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
      <Stack.Screen
        name="route"
        options={{
          title: '寻路指南',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="route-record"
        options={{
          title: '记录路线',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: '对话',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="rituals"
        options={{
          title: '习俗日历',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="rituals/[key]"
        options={{
          title: '习俗详情',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
