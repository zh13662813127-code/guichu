/**
 * 设置首页
 * 包含 LLM 配置入口等设置项
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>设置</Text>
      </View>

      {/* LLM 配置入口 */}
      <Pressable
        style={styles.settingItem}
        onPress={() => router.push('/settings/llm' as any)}
      >
        <View style={styles.settingLeft}>
          <Text style={styles.settingIcon}>🤖</Text>
          <View>
            <Text style={styles.settingLabel}>LLM 配置</Text>
            <Text style={styles.settingHint}>配置大模型 API，用于蒸馏人格档案</Text>
          </View>
        </View>
        <Text style={styles.settingArrow}>›</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  header: {
    padding: 16,
  },
  title: {
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
  },
  settingLabel: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '500',
  },
  settingHint: {
    color: Colors.inkMute,
    fontSize: 12,
    marginTop: 2,
  },
  settingArrow: {
    color: Colors.inkMute,
    fontSize: 22,
    fontWeight: '300',
  },
});
