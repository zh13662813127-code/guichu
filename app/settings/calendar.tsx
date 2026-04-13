/**
 * 习俗提醒（日历联动）页
 * 把习俗重要日子加入手机系统日历
 * Web 端降级显示事件列表但无法同步
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { useAncestorStore } from '../../src/stores/ancestorStore';
import { calcRitualEvents, type RitualEvent } from '../../src/features/rituals/calcRituals';

const isNative = Platform.OS !== 'web';
const isWeb = Platform.OS === 'web';

// ─── 提前提醒选项 ──────────────────────────────────────

const REMINDER_OPTIONS = [
  { label: '当天', minutes: 0 },
  { label: '1天前', minutes: 24 * 60 },
  { label: '3天前', minutes: 3 * 24 * 60 },
  { label: '7天前', minutes: 7 * 24 * 60 },
  { label: '14天前', minutes: 14 * 24 * 60 },
];

// ─── 存储工具 ──────────────────────────────────────────

/** 读取上次同步时间 */
async function loadLastSync(): Promise<string | null> {
  try {
    if (isNative) {
      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();
      return storage.getString('calendar_last_sync') || null;
    } else {
      return localStorage.getItem('calendar_last_sync');
    }
  } catch {
    return null;
  }
}

/** 保存同步时间 */
async function saveLastSync(time: string) {
  try {
    if (isNative) {
      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();
      storage.set('calendar_last_sync', time);
    } else {
      localStorage.setItem('calendar_last_sync', time);
    }
  } catch { /* 忽略 */ }
}

// ─── 日历事件项 ──────────────────────────────────────

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  description: string;
  checked: boolean;
  /** 所属长辈名 */
  ancestorName?: string;
}

// ─── 主组件 ───────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [reminderIndex, setReminderIndex] = useState(3); // 默认 7天前
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 弹窗
  const [syncResultModal, setSyncResultModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [webModal, setWebModal] = useState(false);
  const [reminderModal, setReminderModal] = useState(false);

  // 计算所有习俗事件
  useEffect(() => {
    const allItems: CalendarItem[] = [];

    for (const ancestor of ancestors) {
      if (!ancestor.death_date) continue;

      const events = calcRitualEvents({
        deathDate: ancestor.death_date,
      });

      // 只保留未来事件
      for (const evt of events) {
        if (evt.isPast) continue;
        allItems.push({
          id: `${ancestor.id}_${evt.key}`,
          title: `${ancestor.name} ${evt.name}`,
          date: evt.dateSolar,
          description: evt.description,
          checked: true,
          ancestorName: ancestor.name,
        });
      }
    }

    // 按日期排序
    allItems.sort((a, b) => a.date.localeCompare(b.date));
    setItems(allItems);

    loadLastSync().then((t) => {
      setLastSync(t);
      setIsLoading(false);
    });
  }, [ancestors]);

  /** 切换勾选 */
  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  /** 全选/全不选 */
  const toggleAll = useCallback(() => {
    const allChecked = items.every((i) => i.checked);
    setItems((prev) => prev.map((i) => ({ ...i, checked: !allChecked })));
  }, [items]);

  /** 同步到系统日历 */
  const handleSync = useCallback(async () => {
    if (isWeb) {
      setWebModal(true);
      return;
    }

    setIsSyncing(true);
    const checkedItems = items.filter((i) => i.checked);

    try {
      // 动态导入 expo-calendar
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Calendar: any = require('expo-calendar');

      // 请求权限
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        setSyncResultModal({ visible: true, message: '需要日历权限才能同步。请在系统设置中授权。' });
        setIsSyncing(false);
        return;
      }

      // 获取默认日历或创建专属日历
      let calendarId: string;
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const guichuCal = calendars.find((c: any) => c.title === '归处');

      if (guichuCal) {
        calendarId = guichuCal.id;
      } else {
        // 创建归处专属日历
        const defaultCalendarSource =
          Platform.OS === 'ios'
            ? calendars.find((c: any) => c.source?.name === 'iCloud')?.source ||
              calendars.find((c: any) => c.allowsModifications)?.source
            : { isLocalAccount: true, name: '归处', type: 'LOCAL' as const };

        if (!defaultCalendarSource) {
          setSyncResultModal({ visible: true, message: '无法找到可用的日历源。' });
          setIsSyncing(false);
          return;
        }

        calendarId = await Calendar.createCalendarAsync({
          title: '归处',
          color: Colors.vermilion,
          entityType: Calendar.EntityTypes.EVENT,
          source: defaultCalendarSource as any,
          name: 'guichu',
          ownerAccount: 'personal',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
      }

      // 创建事件
      let successCount = 0;
      const reminderMinutes = REMINDER_OPTIONS[reminderIndex].minutes;

      for (const item of checkedItems) {
        try {
          const startDate = new Date(item.date + 'T09:00:00');
          const endDate = new Date(item.date + 'T10:00:00');

          await Calendar.createEventAsync(calendarId, {
            title: item.title,
            notes: item.description,
            startDate,
            endDate,
            allDay: false,
            alarms: reminderMinutes > 0
              ? [{ relativeOffset: -reminderMinutes }]
              : [{ relativeOffset: 0 }],
          });
          successCount++;
        } catch (e) {
          console.warn('创建日历事件失败:', item.title, e);
        }
      }

      // 保存同步时间
      const syncTime = new Date().toISOString();
      await saveLastSync(syncTime);
      setLastSync(syncTime);

      setSyncResultModal({
        visible: true,
        message: `成功同步 ${successCount}/${checkedItems.length} 个事件到系统日历。`,
      });
    } catch (e: any) {
      console.error('日历同步失败:', e);
      setSyncResultModal({
        visible: true,
        message: `同步失败：${e?.message || '未知错误'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [items, reminderIndex]);

  const checkedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={Colors.vermilion} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        <Text style={s.desc}>
          将习俗日历同步到手机日历，重要日子不再遗忘。
        </Text>

        {items.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>
              暂无习俗事件。{'\n'}请先添加长辈并设置去世日期。
            </Text>
          </View>
        ) : (
          <>
            {/* 全选/反选 */}
            <View style={s.selectAllRow}>
              <Text style={s.selectAllText}>
                以下日子将被添加到日历（{checkedCount}/{items.length}）
              </Text>
              <Pressable onPress={toggleAll}>
                <Text style={s.selectAllBtn}>
                  {items.every((i) => i.checked) ? '全不选' : '全选'}
                </Text>
              </Pressable>
            </View>

            {/* 事件列表 */}
            <View style={s.listCard}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  style={s.eventItem}
                  onPress={() => toggleItem(item.id)}
                >
                  {/* Checkbox */}
                  <View style={[s.checkbox, item.checked && s.checkboxChecked]}>
                    {item.checked && <Text style={s.checkmark}>{'\u2713'}</Text>}
                  </View>
                  <View style={s.eventInfo}>
                    <Text style={s.eventTitle}>{item.title}</Text>
                    <Text style={s.eventDate}>{item.date}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* 提前提醒 */}
            <Text style={s.label}>提前提醒</Text>
            <Pressable
              style={({ pressed }) => [s.picker, pressed && { opacity: 0.7 }]}
              onPress={() => setReminderModal(true)}
            >
              <Text style={s.pickerText}>{REMINDER_OPTIONS[reminderIndex].label}</Text>
              <Text style={s.pickerArrow}>{'\u25BC'}</Text>
            </Pressable>

            {/* 同步按钮 */}
            <Pressable
              style={({ pressed }) => [
                s.syncBtn,
                (isSyncing || checkedCount === 0) && s.syncBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleSync}
              disabled={isSyncing || checkedCount === 0}
            >
              {isSyncing ? (
                <ActivityIndicator color={Colors.paper} size="small" />
              ) : (
                <Text style={s.syncBtnText}>同步到日历</Text>
              )}
            </Pressable>

            {/* 上次同步 */}
            <Text style={s.lastSyncText}>
              上次同步：{lastSync ? new Date(lastSync).toLocaleString('zh-CN') : '从未'}
            </Text>

            {/* Web 端提示 */}
            {isWeb && (
              <View style={s.webHint}>
                <Text style={s.webHintText}>
                  日历同步仅在手机端可用。你可以在此查看事件列表。
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── 提醒选择弹窗 ─── */}
      <Modal visible={reminderModal} transparent animationType="fade" onRequestClose={() => setReminderModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setReminderModal(false)}>
          <Pressable style={s.reminderCard} onPress={(e) => e.stopPropagation()}>
            <Text style={s.reminderTitle}>提前提醒</Text>
            {REMINDER_OPTIONS.map((opt, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  s.reminderOption,
                  i === reminderIndex && s.reminderOptionActive,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => { setReminderIndex(i); setReminderModal(false); }}
              >
                <Text style={[
                  s.reminderOptionText,
                  i === reminderIndex && s.reminderOptionTextActive,
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── 同步结果弹窗 ─── */}
      <ConfirmModal
        visible={syncResultModal.visible}
        title="同步结果"
        message={syncResultModal.message}
        confirmLabel="好的"
        onConfirm={() => setSyncResultModal({ visible: false, message: '' })}
        onCancel={() => setSyncResultModal({ visible: false, message: '' })}
      />

      {/* ─── Web 端不支持弹窗 ─── */}
      <ConfirmModal
        visible={webModal}
        title="提示"
        message="日历同步功能仅在手机端（iOS/Android）可用。"
        confirmLabel="知道了"
        onConfirm={() => setWebModal(false)}
        onCancel={() => setWebModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── 样式 ──────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 60 },

  desc: {
    color: Colors.inkLight,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },

  // ─── 空状态 ───────────────────────────────
  emptyCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.inkMute,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ─── 全选行 ───────────────────────────────
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectAllText: {
    color: Colors.inkLight,
    fontSize: 13,
    fontWeight: '500',
  },
  selectAllBtn: {
    color: Colors.vermilion,
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── 事件列表卡片 ───────────────────────────
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: 'hidden',
    marginBottom: 20,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.inkMute,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.vermilion,
    borderColor: Colors.vermilion,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  eventInfo: { flex: 1 },
  eventTitle: {
    color: Colors.ink,
    fontSize: 14,
    fontWeight: '500',
  },
  eventDate: {
    color: Colors.inkMute,
    fontSize: 12,
    marginTop: 2,
  },

  // ─── Picker ───────────────────────────────
  label: {
    color: Colors.inkLight,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 20,
  },
  pickerText: { color: Colors.ink, fontSize: 15 },
  pickerArrow: { color: Colors.inkMute, fontSize: 12 },

  // ─── 同步按钮 ───────────────────────────────
  syncBtn: {
    height: 52,
    backgroundColor: Colors.vermilion,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: {
    color: Colors.paper,
    fontSize: 16,
    fontWeight: '600',
  },

  // ─── 上次同步 ───────────────────────────────
  lastSyncText: {
    color: Colors.inkMute,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },

  // ─── 提醒弹窗 ───────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  reminderCard: {
    backgroundColor: Colors.paper,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  reminderTitle: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  reminderOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: Colors.paperDark,
  },
  reminderOptionActive: {
    backgroundColor: Colors.vermilion + '15',
    borderWidth: 1.5,
    borderColor: Colors.vermilion,
  },
  reminderOptionText: {
    color: Colors.ink,
    fontSize: 15,
    textAlign: 'center',
  },
  reminderOptionTextActive: {
    color: Colors.vermilion,
    fontWeight: '600',
  },

  // ─── Web 提示 ───────────────────────────────
  webHint: {
    backgroundColor: Colors.amber + '15',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  webHintText: {
    color: Colors.amber,
    fontSize: 13,
    textAlign: 'center',
  },
});
