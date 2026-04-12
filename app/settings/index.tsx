import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F3EC" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#1F1B16", fontSize: 24, fontWeight: "600" }}>设置</Text>
      </View>
    </SafeAreaView>
  );
}
