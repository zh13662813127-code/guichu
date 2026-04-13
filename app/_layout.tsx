/**
 * 根布局 — 底部 Tab 导航
 * 线装书风格的 tab bar：选中圆点指示器 + 微妙顶部阴影
 */

import "../global.css";
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Home, Users, Network, Settings } from "lucide-react-native";
import { Colors } from "../src/constants/colors";

/** 自定义 tab 图标，选中时放大 + 底部圆点 */
function TabIcon({
  IconComponent,
  color,
  size,
  focused,
}: {
  IconComponent: typeof Home;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View style={tabIconStyles.wrap}>
      <View style={focused ? tabIconStyles.iconFocused : undefined}>
        <IconComponent color={color} size={size} />
      </View>
      {/* 选中态圆点指示器 */}
      {focused && <View style={tabIconStyles.dot} />}
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconFocused: {
    transform: [{ scale: 1.1 }],
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.vermilion,
    marginTop: 4,
  },
});

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.paper,
          borderTopColor: Colors.divider,
          height: Platform.OS === "ios" ? 72 : 64,
          paddingBottom: Platform.OS === "ios" ? 12 : 8,
          paddingTop: 6,
          // 微妙的顶部阴影
          shadowColor: Colors.ink,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 8,
        },
        tabBarActiveTintColor: Colors.vermilion,
        tabBarInactiveTintColor: Colors.inkLight,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "时间线",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              IconComponent={Home}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ancestors"
        options={{
          title: "长辈",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              IconComponent={Users}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tree"
        options={{
          title: "族谱",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              IconComponent={Network}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "设置",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              IconComponent={Settings}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
