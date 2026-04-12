/**
 * 设置首页
 * 包含 LLM 配置、语音引擎、地图、地区、提醒、数据、关于等入口
 */

import { View, Text, Pressable, ScrollView, Alert, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';

/** 设置项数据 */
interface SettingItem {
  icon: string;
  label: string;
  hint: string;
  onPress: () => void;
}

/** 「开发中」提示 */
function alertWIP(feature: string) {
  Alert.alert('开发中', `${feature}功能正在开发中，敬请期待`);
}

/** 关于弹窗 */
function showAbout() {
  Alert.alert(
    '关于归处',
    '版本：0.1.0 MVP\n' +
      '协议：MIT License\n\n' +
      '一个帮你记住家人故事的 App',
    [
      { text: '访问 GitHub', onPress: () => Linking.openURL('https://github.com/') },
      { text: '知道了', style: 'cancel' },
    ]
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  const items: SettingItem[] = [
    {
      icon: '🤖',
      label: 'LLM 配置',
      hint: '配置大模型 API，用于蒸馏人格档案',
      onPress: () => router.push('/settings/llm' as any),
    },
    {
      icon: '🔊',
      label: '语音引擎',
      hint: '配置 TTS 语音合成引擎',
      onPress: () => alertWIP('语音引擎'),
    },
    {
      icon: '📍',
      label: '默认地图 App',
      hint: '选择导航时打开的地图应用',
      onPress: () => alertWIP('默认地图 App'),
    },
    {
      icon: '🌍',
      label: '我的地区（习俗）',
      hint: '设置所在地区，获取本地习俗信息',
      onPress: () => alertWIP('我的地区'),
    },
    {
      icon: '🔔',
      label: '习俗提醒',
      hint: '节气、忌日等自动提醒',
      onPress: () => alertWIP('习俗提醒'),
    },
    {
      icon: '📦',
      label: '数据导入导出',
      hint: '备份或迁移你的数据',
      onPress: () => alertWIP('数据导入导出'),
    },
    {
      icon: 'ℹ️',
      label: '关于',
      hint: '版本信息、开源协议',
      onPress: showAbout,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>设置</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            style={styles.settingItem}
            onPress={item.onPress}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>{item.icon}</Text>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingHint}>{item.hint}</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
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
  settingTextGroup: {
    flex: 1,
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
