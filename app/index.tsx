/**
 * 首页 — 丰富的归处主界面
 * 包含：标题栏、快捷功能区、我的长辈、习俗时间线
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Sparkles,
  MessageCircle,
  Map,
  ChevronRight,
  Navigation,
  Plus,
  Calendar,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { useAncestorStore } from '../src/stores/ancestorStore';
import { AvatarCircle } from '../src/components/AvatarCircle';
import { calculateRituals, type RitualEvent } from '../src/features/rituals/calcRituals';

// ─── 类型定义 ───────────────────────────────────────────

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

// ─── 辅助函数 ───────────────────────────────────────────

/** 格式化日期为 "4月5日 周日" */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}

// ─── 快捷功能定义 ───────────────────────────────────────

interface QuickAction {
  key: string;
  icon: React.ReactNode;
  label: string;
  /** 是否需要已有长辈才能使用 */
  needsAncestor: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'pin',
    icon: <MapPin color={Colors.vermilion} size={24} />,
    label: '记录墓地',
    needsAncestor: false,
  },
  {
    key: 'distill',
    icon: <Sparkles color={Colors.jade} size={24} />,
    label: '蒸馏人格',
    needsAncestor: true,
  },
  {
    key: 'chat',
    icon: <MessageCircle color={Colors.amber} size={24} />,
    label: '对话',
    needsAncestor: true,
  },
  {
    key: 'route',
    icon: <Map color={Colors.inkLight} size={24} />,
    label: '寻路指南',
    needsAncestor: true,
  },
];

// ─── 主组件 ─────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { ancestors, isLoading, loadAncestors } = useAncestorStore();

  useEffect(() => {
    loadAncestors();
  }, []);

  // 当前年月
  const now = new Date();
  const headerDate = `${now.getFullYear()}年${now.getMonth() + 1}月`;

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

  const hasAncestors = ancestors.length > 0;
  const hasEvents = dateGroups.length > 0;

  /** 快捷功能点击处理 */
  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      // 没有长辈时，所有功能都跳转到添加长辈页
      if (action.needsAncestor && !hasAncestors) {
        router.push('/ancestors/new' as any);
        return;
      }
      if (!hasAncestors && action.key === 'pin') {
        router.push('/ancestors/new' as any);
        return;
      }

      // 有长辈时，直接跳转到对应功能页
      // 如果只有一个长辈，直接进入；多个长辈则跳到列表页让用户选
      const firstId = ancestors[0]?.id;

      switch (action.key) {
        case 'pin':
          router.push(`/ancestors/${firstId}/confirm-location` as any);
          break;
        case 'distill':
          if (ancestors.length === 1) {
            router.push(`/ancestors/${firstId}/distill` as any);
          } else {
            router.push('/ancestors' as any);
          }
          break;
        case 'chat':
          if (ancestors.length === 1) {
            router.push(`/ancestors/${firstId}/chat` as any);
          } else {
            router.push('/ancestors' as any);
          }
          break;
        case 'route':
          if (ancestors.length === 1) {
            router.push(`/ancestors/${firstId}/route` as any);
          } else {
            router.push('/ancestors' as any);
          }
          break;
      }
    },
    [hasAncestors, ancestors, router],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── 区域 A：顶部标题栏 ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>归处</Text>
          <Text style={styles.headerDate}>{headerDate}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.pinButton,
            pressed && styles.pinButtonPressed,
          ]}
          onPress={() => {
            if (hasAncestors) {
              router.push(`/ancestors/${ancestors[0].id}/confirm-location` as any);
            } else {
              router.push('/ancestors/new' as any);
            }
          }}
        >
          <MapPin color={Colors.paper} size={16} />
          <Text style={styles.pinButtonText}>记录此地</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.vermilion} size="large" />
          </View>
        ) : (
          <>
            {/* ── 区域 B：快捷功能卡片区（用 View 替代 ScrollView，避免 Web 端事件被吞） ── */}
            <View style={styles.quickActionsRow}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.key}
                  style={({ pressed }) => [
                    styles.quickCard,
                    pressed && styles.quickCardPressed,
                  ]}
                  onPress={() => handleQuickAction(action)}
                >
                  {action.icon}
                  <Text style={styles.quickCardLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* ── 区域 C：我的长辈（纵向卡片列表） ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>我的长辈</Text>
              <Pressable
                style={styles.addButton}
                onPress={() => router.push('/ancestors/new' as any)}
              >
                <Plus color={Colors.vermilion} size={16} />
                <Text style={styles.addButtonText}>添加</Text>
              </Pressable>
            </View>

            <View style={styles.ancestorList}>
              {hasAncestors ? (
                <>
                  {ancestors.map((ancestor) => {
                    // 计算享年
                    let ageText = '';
                    if (ancestor.birth_year && (ancestor.death_year || ancestor.death_date)) {
                      const deathY = ancestor.death_year || (ancestor.death_date ? parseInt(ancestor.death_date.split('-')[0]) : 0);
                      if (deathY) ageText = `享年 ${deathY - ancestor.birth_year} 岁`;
                    }
                    // 计算下一个节日
                    let nextRitual: { name: string; daysFromNow: number } | null = null;
                    if (ancestor.death_date) {
                      try {
                        const events = calculateRituals(ancestor.death_date);
                        const upcoming = events.filter(e => !e.isPast);
                        if (upcoming.length > 0) nextRitual = { name: upcoming[0].name, daysFromNow: upcoming[0].daysFromNow };
                      } catch {}
                    }

                    return (
                      <Pressable
                        key={ancestor.id}
                        style={({ pressed }) => [styles.ancestorRowCard, pressed && { opacity: 0.85 }]}
                        onPress={() => router.push(`/ancestors/${ancestor.id}` as any)}
                      >
                        {/* 头像：有 avatar_path 显示真实头像，否则显示首字母 */}
                        {ancestor.avatar_path ? (
                          <Image
                            source={{ uri: ancestor.avatar_path }}
                            style={{ width: 48, height: 48, borderRadius: 24 }}
                          />
                        ) : (
                          <AvatarCircle name={ancestor.name} size={48} />
                        )}
                        <View style={styles.ancestorRowInfo}>
                          <View style={styles.ancestorRowTop}>
                            {ancestor.relationship && (
                              <Text style={styles.ancestorRowRelTag}>{ancestor.relationship}</Text>
                            )}
                            <Text style={styles.ancestorRowName}>{ancestor.name}</Text>
                          </View>
                          {ageText ? (
                            <Text style={styles.ancestorRowAge}>{ageText}</Text>
                          ) : (
                            <Text style={styles.ancestorRowAge}>
                              {ancestor.birth_year ? `${ancestor.birth_year}年生` : ''}
                              {!ancestor.death_date ? ' · 健在' : ''}
                            </Text>
                          )}
                          {ancestor.honor && (
                            <Text style={styles.ancestorRowHonor} numberOfLines={1}>
                              {ancestor.honor}
                            </Text>
                          )}
                        </View>
                        <View style={styles.ancestorRowRight}>
                          {nextRitual ? (
                            <>
                              <Text style={styles.ancestorRowRitual} numberOfLines={1}>{nextRitual.name}</Text>
                              <Text style={styles.ancestorRowCountdown}>
                                {nextRitual.daysFromNow === 0 ? '今天' : `${nextRitual.daysFromNow}天后`}
                              </Text>
                            </>
                          ) : null}
                          <ChevronRight color={Colors.inkMute} size={16} />
                        </View>
                      </Pressable>
                    );
                  })}
                  {/* 添加更多 */}
                  <Pressable
                    style={({ pressed }) => [styles.addMoreCard, pressed && { opacity: 0.8 }]}
                    onPress={() => router.push('/ancestors/new' as any)}
                  >
                    <Plus color={Colors.inkMute} size={18} />
                    <Text style={styles.addMoreText}>添加更多长辈</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.emptyAncestorCard, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push('/ancestors/new' as any)}
                >
                  <Text style={styles.emptyAncestorTitle}>添加你的第一位家人</Text>
                  <Text style={styles.emptyAncestorHint}>记录他们的故事，留住珍贵的记忆</Text>
                </Pressable>
              )}
            </View>

            {/* ── 区域 D：习俗时间线 ── */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Calendar color={Colors.inkLight} size={18} />
                <Text style={styles.sectionTitle}>习俗提醒</Text>
              </View>
            </View>

            {hasEvents ? (
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

                      <Text
                        style={[
                          styles.eventDescription,
                          event.isPast && styles.textMute,
                        ]}
                      >
                        {event.description}
                      </Text>

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

                      {event.homeNotes && !event.isPast && (
                        <View style={styles.regionTag}>
                          <Text style={styles.regionTagText}>
                            {event.homeNotes}
                          </Text>
                        </View>
                      )}

                      <View style={styles.eventActions}>
                        <Pressable
                          style={styles.actionButton}
                          onPress={() =>
                            router.push(`/ancestors/${event.ancestorId}` as any)
                          }
                        >
                          <ChevronRight
                            color={
                              event.isPast ? Colors.inkMute : Colors.vermilion
                            }
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
                            color={
                              event.isPast ? Colors.inkMute : Colors.vermilion
                            }
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
            ) : (
              <View style={styles.emptyRitualCard}>
                <Calendar color={Colors.inkMute} size={32} />
                <Text style={styles.emptyRitualText}>
                  {hasAncestors
                    ? '添加长辈的去世日期后，\n习俗提醒将自动出现'
                    : '添加长辈后，\n习俗提醒将自动出现'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 样式 ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },

  // 区域 A：标题栏
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    color: Colors.ink,
    fontSize: 26,
    fontWeight: '700',
  },
  headerDate: {
    color: Colors.inkMute,
    fontSize: 14,
    marginTop: 2,
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.vermilion,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 5,
  },
  pinButtonPressed: {
    backgroundColor: Colors.vermilionPressed,
  },
  pinButtonText: {
    color: Colors.paper,
    fontSize: 14,
    fontWeight: '600',
  },

  // 滚动容器
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },

  // 区域 B：快捷功能（普通 View 行布局，Web 端兼容）
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 8,
  },
  quickCard: {
    flex: 1,
    height: 80,
    backgroundColor: Colors.paperDark,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickCardPressed: {
    opacity: 0.7,
  },
  quickCardLabel: {
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '500',
  },

  // 通用区段标题
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '500',
  },

  // 区域 C：我的长辈（纵向卡片列表）
  ancestorList: {
    paddingHorizontal: 20,
  },
  ancestorRowCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ancestorRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ancestorRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  ancestorRowRelTag: {
    color: Colors.paper,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: Colors.vermilion,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  ancestorRowName: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  ancestorRowAge: {
    color: Colors.inkLight,
    fontSize: 13,
  },
  ancestorRowHonor: {
    color: Colors.amber,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  ancestorRowRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
    gap: 2,
  },
  ancestorRowRitual: {
    color: Colors.vermilion,
    fontSize: 12,
    fontWeight: '500',
  },
  ancestorRowCountdown: {
    color: Colors.inkMute,
    fontSize: 11,
  },
  addMoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderStyle: 'dashed',
    borderRadius: 16,
    marginBottom: 10,
  },
  addMoreText: {
    color: Colors.inkMute,
    fontSize: 14,
  },
  // 空长辈引导
  emptyAncestorCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
  },
  emptyAncestorTitle: {
    color: Colors.inkLight,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyAncestorHint: {
    color: Colors.inkMute,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },

  // 区域 D：习俗时间线
  dateGroup: {
    paddingHorizontal: 20,
    marginTop: 16,
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

  // 空习俗提醒
  emptyRitualCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  emptyRitualText: {
    color: Colors.inkMute,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
