/**
 * 设置页路由布局
 * 包含设置首页和 LLM 配置子页
 */

import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';

export default function SettingsLayout() {
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
          title: '设置',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="llm"
        options={{
          title: 'LLM 配置',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="tts"
        options={{
          title: '语音引擎',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="region"
        options={{
          title: '我的地区',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="calendar"
        options={{
          title: '习俗提醒',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
