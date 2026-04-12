import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TreeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F3EC" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#1F1B16", fontSize: 24, fontWeight: "600" }}>族谱</Text>
        <Text style={{ color: "#5E574E", fontSize: 17, marginTop: 16 }}>
          添加长辈并建立关系后，族谱树将在这里显示。
        </Text>
      </View>
    </SafeAreaView>
  );
}
