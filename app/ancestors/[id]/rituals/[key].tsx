/**
 * 习俗详情页
 * 展示单个习俗的完整信息：说明、待办、物品清单、注意事项
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../../../../src/constants/colors';
import { useAncestorStore } from '../../../../src/stores/ancestorStore';
import {
  calcRitualEvents,
  type RitualEvent,
} from '../../../../src/features/rituals/calcRituals';
import { navigateToLocation } from '../../../../src/features/grave-pin/useNavigate';

// ─── 主组件 ──────────────────────────────────────────────

export default function RitualDetailScreen() {
  const { id, key } = useLocalSearchParams<{ id: string; key: string }>();
  const ancestors = useAncestorStore((s) => s.ancestors);
  const ancestor = ancestors.find((a) => a.id === id);

  // 物品勾选状态（每年重置 — 通过 useState 即可，组件卸载自动重置）
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // 查找对应的习俗事件
  const event: RitualEvent | undefined = useMemo(() => {
    if (!ancestor?.death_date || !key) return undefined;
    const events = calcRitualEvents({
      deathDate: ancestor.death_date,
      region: undefined,
    });
    return events.find((e) => e.key === key);
  }, [ancestor?.death_date, key]);

  // 切换勾选
  const toggleItem = useCallback((item: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }, []);

  // 导航去扫墓
  const handleNavigate = useCallback(async () => {
    // TODO: 从长辈数据中读取墓址坐标
    // 目前使用 Alert 提示
    Alert.alert(
      '导航去扫墓',
      '暂未设置墓址位置，请先在长辈详情页确认墓址。',
      [{ text: '好的' }]
    );
    // 如果有坐标，调用:
    // await navigateToLocation({ latitude: xxx, longitude: xxx, name: `${ancestor?.name}的墓地` });
  }, [ancestor]);

  // ─── 没有找到事件 ─────────────────────────────────────
  if (!ancestor || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>未找到习俗信息</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 计算去世第几年
  const deathYear = new Date(ancestor.death_date!).getFullYear();
  const eventYear = new Date(event.dateSolar).getFullYear();
  const yearNumber = eventYear - deathYear;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 标题 */}
        <Text style={styles.title}>{event.name}</Text>

        {/* 日期信息 */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{event.dateSolar}</Text>
          {event.dateLunar && (
            <Text style={styles.dateLunar}>{event.dateLunar}</Text>
          )}
        </View>
        <Text style={styles.yearInfo}>
          去世第 {yearNumber} 年
        </Text>

        {/* 倒计时 */}
        {!event.isPast && (
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>
              {event.daysFromNow === 0
                ? '就是今天'
                : `还有 ${event.daysFromNow} 天`}
            </Text>
          </View>
        )}
        {event.isPast && (
          <View style={[styles.countdownBadge, styles.countdownBadgePast]}>
            <Text style={[styles.countdownText, styles.countdownTextPast]}>
              已过 {Math.abs(event.daysFromNow)} 天
            </Text>
          </View>
        )}

        {/* 习俗说明 */}
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📖</Text>
          <Text style={styles.sectionTitle}>习俗说明</Text>
          <Text style={styles.sectionBody}>{event.description}</Text>
        </View>

        {/* 要做什么 */}
        {event.todoItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={styles.sectionTitle}>要做什么</Text>
            {event.todoItems.map((item, i) => (
              <View key={i} style={styles.todoItem}>
                <Text style={styles.todoBullet}>•</Text>
                <Text style={styles.todoText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 要带什么（可勾选清单） */}
        {event.bringItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionIcon}>🛒</Text>
            <Text style={styles.sectionTitle}>要带什么</Text>
            {event.bringItems.map((item, i) => {
              const isChecked = checkedItems.has(item);
              return (
                <Pressable
                  key={i}
                  style={styles.checkItem}
                  onPress={() => toggleItem(item)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isChecked && styles.checkboxChecked,
                    ]}
                  >
                    {isChecked && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.checkItemText,
                      isChecked && styles.checkItemTextChecked,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
            {/* 进度提示 */}
            <Text style={styles.checkProgress}>
              已备齐 {checkedItems.size}/{event.bringItems.length} 项
            </Text>
          </View>
        )}

        {/* 家中注意事项 */}
        {event.homeNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionIcon}>🏠</Text>
            <Text style={styles.sectionTitle}>家中注意事项</Text>
            <Text style={styles.sectionBody}>{event.homeNotes}</Text>
          </View>
        )}

        {/* 导航去扫墓按钮 */}
        <Pressable style={styles.navBtn} onPress={handleNavigate}>
          <Text style={styles.navBtnText}>🧭 导航去扫墓</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 样式 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.crimson,
    fontSize: 16,
    textAlign: 'center',
  },

  // ─── 标题区 ──────────────────────────────────
  title: {
    color: Colors.ink,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  dateText: {
    color: Colors.inkLight,
    fontSize: 16,
  },
  dateLunar: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '500',
  },
  yearInfo: {
    color: Colors.inkMute,
    fontSize: 14,
    marginBottom: 12,
  },

  // ─── 倒计时标签 ─────────────────────────────
  countdownBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDE8E4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 24,
  },
  countdownBadgePast: {
    backgroundColor: Colors.paperDark,
  },
  countdownText: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '600',
  },
  countdownTextPast: {
    color: Colors.inkMute,
  },

  // ─── 内容段落 ────────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionBody: {
    color: Colors.inkLight,
    fontSize: 16,
    lineHeight: 26,
  },

  // ─── 待办列表 ────────────────────────────────
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  todoBullet: {
    color: Colors.vermilion,
    fontSize: 16,
    marginRight: 8,
    lineHeight: 24,
  },
  todoText: {
    color: Colors.ink,
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },

  // ─── 可勾选清单 ──────────────────────────────
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.jade,
    borderColor: Colors.jade,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkItemText: {
    color: Colors.ink,
    fontSize: 16,
    flex: 1,
  },
  checkItemTextChecked: {
    color: Colors.inkMute,
    textDecorationLine: 'line-through',
  },
  checkProgress: {
    color: Colors.inkMute,
    fontSize: 13,
    textAlign: 'right',
    marginTop: 8,
  },

  // ─── 导航按钮 ────────────────────────────────
  navBtn: {
    height: 56,
    backgroundColor: Colors.vermilion,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  navBtnText: {
    color: Colors.paper,
    fontSize: 17,
    fontWeight: '600',
  },
});
