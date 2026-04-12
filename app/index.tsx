/**
 * 主页 -- 时间线日历视图
 * 展示所有长辈的习俗事件时间线
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, ChevronRight, Navigation } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { useAncestorStore } from '../src/stores/ancestorStore';
import { calculateRituals, type RitualEvent } from '../src/features/rituals/calcRituals';

/** 带长辈名的事件 */
interface TimelineEvent extends RitualEvent {
  ancestorName: string;
  ancestorId: string;
}

/** 按日期分组的事件 */
interface DateGroup {
  dateSolar: string;
  displayDate: string;
  events: TimelineEvent[];
  isPast: boolean;
}

/** 格式化日期为 "4月5日 周日" */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { ancestors, isLoading, loadAncestors } = useAncestorStore();

  useEffect(() => {
    loadAncestors();
  }, []);

  // 当前年月
  const now = new Date();
  const headerTitle = `归处 · ${now.getFullYear()}年${now.getMonth() + 1}月`;

  // 计算所有长辈的习俗事件
  const dateGroups = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    for (const ancestor of ancestors) {
      if (!ancestor.death_date) continue;
      const rituals = calculateRituals(ancestor.death_date);
      for (const r of rituals) {
        allEvents.push({
          ...r,
          ancestorName: ancestor.name,
          ancestorId: ancestor.id,
        });
      }
    }

    // 按日期排序
    allEvents.sort((a, b) => a.dateSolar.localeCompare(b.dateSolar));

    // 按日期分组
    const groups: DateGroup[] = [];
    for (const event of allEvents) {
      const last = groups[groups.length - 1];
      if (last && last.dateSolar === event.dateSolar) {
        last.events.push(event);
      } else {
        groups.push({
          dateSolar: event.dateSolar,
          displayDate: formatDateLabel(event.dateSolar),
          events: [event],
          isPast: event.isPast,
        });
      }
    }

    return groups;
  }, [ancestors]);

  const hasEvents = dateGroups.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部固定区 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.pinButton,
            pressed && styles.pinButtonPressed,
          ]}
          onPress={() => {
            // 跳转到定位功能（后续实现）
          }}
        >
          <MapPin color={Colors.paper} size={18} />
          <Text style={styles.pinButtonText}>记录此地</Text>
        </Pressable>
      </View>

      {/* 时间线 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.vermilion} size="large" />
          </View>
        ) : !hasEvents ? (
          /* 空状态 */
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              在你还来得及的时候，{'\n'}把他们留下来。
            </Text>
            <Text style={styles.emptyHint}>
              按下方「长辈」添加你的第一位家人{'\n'}添加去世日期后，习俗提醒将自动出现
            </Text>
          </View>
        ) : (
          /* 事件时间线 */
          dateGroups.map((group) => (
            <View key={group.dateSolar} style={styles.dateGroup}>
              {/* 日期分隔标题 */}
              <View style={styles.dateDivider}>
                <View style={styles.dividerLine} />
                <Text
                  style={[
                    styles.dateTitle,
                    group.isPast && styles.dateTitlePast,
                  ]}
                >
                  {group.displayDate}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* 该日期下的事件卡片 */}
              {group.events.map((event) => (
                <View
                  key={`${event.key}_${event.ancestorId}`}
                  style={[
                    styles.eventCard,
                    event.isPast && styles.eventCardPast,
                  ]}
                >
                  {/* 卡片顶部：长辈名 + 习俗名 + 倒计时 */}
                  <View style={styles.eventHeader}>
                    <View style={styles.eventTitleRow}>
                      <Text
                        style={[
                          styles.ancestorName,
                          event.isPast && styles.textMute,
                        ]}
                      >
                        {event.ancestorName}
                      </Text>
                      <Text
                        style={[
                          styles.ritualName,
                          event.isPast && styles.textMute,
                        ]}
                      >
                        {event.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.countdown,
                        event.isPast && styles.textMute,
                      ]}
                    >
                      {event.isPast
                        ? '已过'
                        : event.daysFromNow === 0
                        ? '今天'
                        : `${event.daysFromNow}天后`}
                    </Text>
                  </View>

                  {/* 描述 */}
                  <Text
                    style={[
                      styles.eventDescription,
                      event.isPast && styles.textMute,
                    ]}
                  >
                    {event.description}
                  </Text>

                  {/* 需带物品（最多显示前3个） */}
                  {event.bringItems.length > 0 && (
                    <Text
                      style={[
                        styles.bringItems,
                        event.isPast && styles.textMute,
                      ]}
                    >
                      需带：{event.bringItems.slice(0, 3).join('、')}
                      {event.bringItems.length > 3 ? ' 等' : ''}
                    </Text>
                  )}

                  {/* 地方特色标签 */}
                  {event.homeNotes && !event.isPast && (
                    <View style={styles.regionTag}>
                      <Text style={styles.regionTagText}>
                        {event.homeNotes}
                      </Text>
                    </View>
                  )}

                  {/* 底部操作按钮 */}
                  <View style={styles.eventActions}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() =>
                        router.push(`/ancestors/${event.ancestorId}` as any)
                      }
                    >
                      <ChevronRight
                        color={event.isPast ? Colors.inkMute : Colors.vermilion}
                        size={16}
                      />
                      <Text
                        style={[
                          styles.actionText,
                          event.isPast && styles.textMute,
                        ]}
                      >
                        查看详情
                      </Text>
                    </Pressable>
                    <Pressable style={styles.actionButton}>
                      <Navigation
                        color={event.isPast ? Colors.inkMute : Colors.vermilion}
                        size={16}
                      />
                      <Text
                        style={[
                          styles.actionText,
                          event.isPast && styles.textMute,
                        ]}
                      >
                        导航
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.vermilion,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 6,
  },
  pinButtonPressed: {
    backgroundColor: Colors.vermilionPressed,
  },
  pinButtonText: {
    color: Colors.paper,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  // 空状态
  emptyCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    color: Colors.inkLight,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  emptyHint: {
    color: Colors.inkMute,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  // 日期分组
  dateGroup: {
    marginTop: 20,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
  },
  dateTitle: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  dateTitlePast: {
    color: Colors.inkMute,
  },
  // 事件卡片
  eventCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  eventCardPast: {
    opacity: 0.6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ancestorName: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  ritualName: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '500',
  },
  countdown: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '500',
  },
  eventDescription: {
    color: Colors.inkLight,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  bringItems: {
    color: Colors.inkLight,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  regionTag: {
    backgroundColor: Colors.amber + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  regionTagText: {
    color: Colors.amber,
    fontSize: 12,
    fontWeight: '500',
  },
  textMute: {
    color: Colors.inkMute,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '500',
  },
});
