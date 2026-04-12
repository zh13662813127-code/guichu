import "../global.css";
import { Tabs } from "expo-router";
import { Home, Users, Network, Settings } from "lucide-react-native";

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#F7F3EC",
          borderTopColor: "#D9D2C2",
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#B33A2A",
        tabBarInactiveTintColor: "#5E574E",
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
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ancestors"
        options={{
          title: "长辈",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tree"
        options={{
          title: "族谱",
          tabBarIcon: ({ color, size }) => <Network color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "设置",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
