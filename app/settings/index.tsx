/**
 * 设置首页
 * 所有弹窗使用 Modal/ConfirmModal，不依赖 Alert.alert（Web 兼容）
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '../../src/constants/colors';
import { Fonts, Labels } from '../../src/constants/typography';
import { useAncestorStore } from '../../src/stores/ancestorStore';
import { exportAncestorsData, importAncestorsData } from '../../src/utils/exportData';
import { ConfirmModal } from '../../src/components/ConfirmModal';

/** 设置项数据 */
interface SettingItem {
  icon: string;
  label: string;
  hint: string;
  status?: 'ready' | 'wip';
  onPress: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);
  const addAncestor = useAncestorStore((s) => s.addAncestor);

  // 弹窗状态
  const [aboutVisible, setAboutVisible] = useState(false);
  const [wipModal, setWipModal] = useState<{ visible: boolean; feature: string }>({ visible: false, feature: '' });
  const [exportModal, setExportModal] = useState(false);
  const [mapModal, setMapModal] = useState(false);
  const [selectedMap, setSelectedMap] = useState<string>('system');

  // 导入结果弹窗
  const [importResultModal, setImportResultModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  /** 处理导入 */
  const handleImport = async () => {
    setExportModal(false);
    try {
      const count = await importAncestorsData(addAncestor);
      setImportResultModal({ visible: true, message: `成功导入 ${count} 条长辈记录` });
    } catch (e: any) {
      // 用户取消选择不提示错误
      if (e?.message === '已取消选择') return;
      setImportResultModal({ visible: true, message: `导入失败：${e?.message || '未知错误'}` });
    }
  };

  /** 处理导出 */
  const handleExport = async () => {
    setExportModal(false);
    try {
      await exportAncestorsData(ancestors);
    } catch (e: any) {
      setWipModal({ visible: true, feature: `导出失败：${e?.message || '未知错误'}` });
    }
  };

  const items: SettingItem[] = [
    {
      icon: '🤖',
      label: 'LLM 配置',
      hint: '配置大模型 API，用于蒸馏人格档案',
      status: 'ready',
      onPress: () => router.push('/settings/llm' as any),
    },
    {
      icon: '🔊',
      label: '语音引擎',
      hint: '配置 TTS 语音合成引擎',
      status: 'ready',
      onPress: () => router.push('/settings/tts' as any),
    },
    {
      icon: '📍',
      label: '默认地图 App',
      hint: `当前：${selectedMap === 'system' ? '系统默认' : selectedMap}`,
      status: 'ready',
      onPress: () => setMapModal(true),
    },
    {
      icon: '🌍',
      label: '我的地区（习俗）',
      hint: '设置所在地区，获取本地习俗信息',
      status: 'ready',
      onPress: () => router.push('/settings/region' as any),
    },
    {
      icon: '🔔',
      label: '习俗提醒',
      hint: '节气、忌日等自动提醒',
      status: 'ready',
      onPress: () => router.push('/settings/calendar' as any),
    },
    {
      icon: '📦',
      label: '数据导入导出',
      hint: '备份或迁移你的数据',
      status: 'ready',
      onPress: () => setExportModal(true),
    },
    {
      icon: 'ℹ️',
      label: '关于',
      hint: '版本信息、开源协议',
      status: 'ready',
      onPress: () => setAboutVisible(true),
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{Labels.pageSettings}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [s.settingItem, pressed && s.settingPressed]}
            onPress={item.onPress}
          >
            <View style={s.settingLeft}>
              <Text style={s.settingIcon}>{item.icon}</Text>
              <View style={s.settingTextGroup}>
                <View style={s.labelRow}>
                  <Text style={s.settingLabel}>{item.label}</Text>
                  {item.status === 'wip' && (
                    <View style={s.wipBadge}><Text style={s.wipText}>开发中</Text></View>
                  )}
                </View>
                <Text style={s.settingHint}>{item.hint}</Text>
              </View>
            </View>
            <ChevronRight color={Colors.inkMute} size={18} />
          </Pressable>
        ))}
      </ScrollView>

      {/* ─── "开发中"提示弹窗 ─── */}
      <ConfirmModal
        visible={wipModal.visible}
        title="功能开发中"
        message={`「${wipModal.feature}」正在开发中，敬请期待。\n\n欢迎到 GitHub 提 Issue 催一催 😄`}
        confirmLabel="知道了"
        onConfirm={() => setWipModal({ visible: false, feature: '' })}
        onCancel={() => setWipModal({ visible: false, feature: '' })}
      />

      {/* ─── 数据导入导出弹窗 ─── */}
      <Modal visible={exportModal} transparent animationType="fade" onRequestClose={() => setExportModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>数据导入导出</Text>
            <Text style={s.modalDesc}>选择操作</Text>

            <Pressable
              style={({ pressed }) => [s.modalBtn, pressed && { opacity: 0.8 }]}
              onPress={handleExport}
            >
              <Text style={s.modalBtnText}>📤 导出所有数据</Text>
              <Text style={s.modalBtnHint}>导出为 JSON 文件</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [s.modalBtn, pressed && { opacity: 0.8 }]}
              onPress={handleImport}
            >
              <Text style={s.modalBtnText}>📥 导入数据</Text>
              <Text style={s.modalBtnHint}>从 JSON 备份恢复</Text>
            </Pressable>

            <Pressable style={s.modalCancel} onPress={() => setExportModal(false)}>
              <Text style={s.modalCancelText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── 地图选择弹窗 ─── */}
      <Modal visible={mapModal} transparent animationType="fade" onRequestClose={() => setMapModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>默认地图 App</Text>
            <Text style={s.modalDesc}>导航时自动打开哪个地图？</Text>

            {[
              { key: 'system', label: '系统默认', hint: Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps' },
              { key: 'amap', label: '高德地图', hint: '国内推荐' },
              { key: 'baidu', label: '百度地图', hint: '' },
              { key: 'google', label: 'Google Maps', hint: '海外推荐' },
            ].map(opt => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  s.mapOption,
                  selectedMap === opt.key && s.mapOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => { setSelectedMap(opt.key); setMapModal(false); }}
              >
                <Text style={[s.mapOptionText, selectedMap === opt.key && s.mapOptionTextActive]}>
                  {opt.label}
                </Text>
                {opt.hint ? <Text style={s.mapOptionHint}>{opt.hint}</Text> : null}
              </Pressable>
            ))}

            <Pressable style={s.modalCancel} onPress={() => setMapModal(false)}>
              <Text style={s.modalCancelText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── 导入结果弹窗 ─── */}
      <ConfirmModal
        visible={importResultModal.visible}
        title="导入数据"
        message={importResultModal.message}
        confirmLabel="知道了"
        onConfirm={() => setImportResultModal({ visible: false, message: '' })}
        onCancel={() => setImportResultModal({ visible: false, message: '' })}
      />

      {/* ─── 关于弹窗 ─── */}
      <Modal visible={aboutVisible} transparent animationType="fade" onRequestClose={() => setAboutVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.aboutName}>归处 Guichu</Text>
            <Text style={s.aboutVer}>v0.1.0</Text>
            <Text style={s.aboutDesc}>开源电子族谱</Text>
            <Text style={s.aboutQuote}>"血脉所系，根脉所归"</Text>
            <Text style={s.aboutLicense}>MIT License</Text>
            <Pressable onPress={() => Linking.openURL('https://github.com/zh13662813127-code/guichu')}>
              <Text style={s.aboutLink}>GitHub: zh13662813127-code/guichu</Text>
            </Pressable>
            <Pressable style={s.aboutCloseBtn} onPress={() => setAboutVisible(false)}>
              <Text style={s.aboutCloseBtnText}>知道了</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  header: { padding: 16 },
  title: { color: Colors.ink, fontSize: 24, fontWeight: '600', fontFamily: Fonts.classical },

  // 设置项
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  settingPressed: { backgroundColor: Colors.paperDark },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: { fontSize: 24 },
  settingTextGroup: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingLabel: { color: Colors.ink, fontSize: 16, fontWeight: '500' },
  settingHint: { color: Colors.inkMute, fontSize: 12, marginTop: 2 },
  wipBadge: {
    backgroundColor: Colors.amber + '25',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  wipText: { color: Colors.amber, fontSize: 10, fontWeight: '600' },

  // Modal 通用
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    backgroundColor: Colors.paper,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '85%',
    maxWidth: 380,
  },
  modalTitle: { color: Colors.ink, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  modalDesc: { color: Colors.inkMute, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  modalBtn: {
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  modalBtnDisabled: { opacity: 0.6 },
  modalBtnText: { color: Colors.ink, fontSize: 15, fontWeight: '500' },
  modalBtnHint: { color: Colors.inkMute, fontSize: 12, marginTop: 2 },
  modalCancel: { paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: Colors.vermilion, fontSize: 15, fontWeight: '500' },

  // 地图选项
  mapOption: {
    backgroundColor: Colors.paperDark,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  mapOptionActive: { borderColor: Colors.vermilion, backgroundColor: Colors.vermilion + '10' },
  mapOptionText: { color: Colors.ink, fontSize: 15, fontWeight: '500' },
  mapOptionTextActive: { color: Colors.vermilion },
  mapOptionHint: { color: Colors.inkMute, fontSize: 12, marginTop: 2 },

  // 关于
  aboutName: { color: Colors.ink, fontSize: 22, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  aboutVer: { color: Colors.inkLight, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  aboutDesc: { color: Colors.ink, fontSize: 16, marginBottom: 16, textAlign: 'center' },
  aboutQuote: { color: Colors.inkLight, fontSize: 14, fontStyle: 'italic', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  aboutLicense: { color: Colors.inkMute, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  aboutLink: { color: Colors.vermilion, fontSize: 13, textDecorationLine: 'underline', marginBottom: 20, textAlign: 'center' },
  aboutCloseBtn: { height: 40, paddingHorizontal: 32, backgroundColor: Colors.vermilion, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  aboutCloseBtnText: { color: Colors.paper, fontSize: 15, fontWeight: '600' },
});
