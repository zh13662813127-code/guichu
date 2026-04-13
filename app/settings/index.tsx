/**
 * 设置首页
 * 包含 LLM 配置、语音引擎、地图、地区、提醒、数据导入导出、关于等入口
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useAncestorStore } from '../../src/stores/ancestorStore';
import { exportAncestorsData } from '../../src/utils/exportData';

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

export default function SettingsScreen() {
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);

  // 关于弹窗状态
  const [aboutVisible, setAboutVisible] = useState(false);

  /** 数据导入导出 — 弹出选项 */
  function handleDataExportImport() {
    Alert.alert('数据导入导出', '选择操作', [
      {
        text: '导出所有数据',
        onPress: async () => {
          try {
            await exportAncestorsData(ancestors);
          } catch (e: any) {
            Alert.alert('导出失败', e?.message || '未知错误');
          }
        },
      },
      {
        text: '导入数据',
        onPress: () => alertWIP('数据导入'),
      },
      { text: '取消', style: 'cancel' },
    ]);
  }

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
      onPress: handleDataExportImport,
    },
    {
      icon: 'ℹ️',
      label: '关于',
      hint: '版本信息、开源协议',
      onPress: () => setAboutVisible(true),
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

      {/* ─── 关于弹窗 ────────────────────────────── */}
      <Modal
        visible={aboutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAboutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.aboutAppName}>归处 Guichu</Text>
            <Text style={styles.aboutVersion}>v0.1.0</Text>
            <Text style={styles.aboutDesc}>开源电子族谱</Text>
            <Text style={styles.aboutQuote}>
              "在你还来得及的时候，把他们留下来。"
            </Text>
            <Text style={styles.aboutLicense}>MIT License</Text>
            <Pressable
              onPress={() =>
                Linking.openURL('https://github.com/zh13662813127-code/guichu')
              }
            >
              <Text style={styles.aboutLink}>
                GitHub: zh13662813127-code/guichu
              </Text>
            </Pressable>
            <Pressable
              style={styles.aboutCloseBtn}
              onPress={() => setAboutVisible(false)}
            >
              <Text style={styles.aboutCloseBtnText}>知道了</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

  // ─── 关于弹窗样式 ────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: Colors.paper,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    width: '80%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  aboutAppName: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  aboutVersion: {
    color: Colors.inkLight,
    fontSize: 14,
    marginBottom: 12,
  },
  aboutDesc: {
    color: Colors.ink,
    fontSize: 16,
    marginBottom: 16,
  },
  aboutQuote: {
    color: Colors.inkLight,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  aboutLicense: {
    color: Colors.inkMute,
    fontSize: 13,
    marginBottom: 8,
  },
  aboutLink: {
    color: Colors.vermilion,
    fontSize: 13,
    textDecorationLine: 'underline',
    marginBottom: 20,
  },
  aboutCloseBtn: {
    height: 40,
    paddingHorizontal: 32,
    backgroundColor: Colors.vermilion,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutCloseBtnText: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },
});
