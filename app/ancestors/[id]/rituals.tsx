/**
 * 习俗日历时间线页
 * 按「已过 / 即将到来 / 未来」三段展示习俗事件
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  SectionList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { useAncestorStore } from '../../../src/stores/ancestorStore';
import {
  calcRitualEvents,
  type RitualEvent,
} from '../../../src/features/rituals/calcRituals';

// ─── 时间段分类 ──────────────────────────────────────────

/** 即将到来的阈值：30 天内 */
const UPCOMING_DAYS = 30;

interface Section {
  title: string;
  type: 'past' | 'upcoming' | 'future';
  data: RitualEvent[];
}

function groupEvents(events: RitualEvent[]): Section[] {
  const past: RitualEvent[] = [];
  const upcoming: RitualEvent[] = [];
  const future: RitualEvent[] = [];

  for (const e of events) {
    if (e.isPast) {
      past.push(e);
    } else if (e.daysFromNow <= UPCOMING_DAYS) {
      upcoming.push(e);
    } else {
      future.push(e);
    }
  }

  const sections: Section[] = [];
  if (past.length > 0) {
    sections.push({ title: '已过', type: 'past', data: past.reverse() });
  }
  if (upcoming.length > 0) {
    sections.push({ title: '即将到来', type: 'upcoming', data: upcoming });
  }
  if (future.length > 0) {
    sections.push({ title: '未来', type: 'future', data: future });
  }

  return sections;
}

// ─── 主组件 ──────────────────────────────────────────────

export default function RitualsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);
  const ancestor = ancestors.find((a) => a.id === id);

  // 折叠状态：已过的默认折叠
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(['past'])
  );

  // 计算习俗事件
  const events = useMemo(() => {
    if (!ancestor?.death_date) return [];
    return calcRitualEvents({
      deathDate: ancestor.death_date,
      region: undefined, // TODO: 从用户设置读取地区
    });
  }, [ancestor?.death_date]);

  const sections = useMemo(() => groupEvents(events), [events]);

  // 切换折叠
  const toggleSection = (type: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // ─── 没有长辈或去世日期 ───────────────────────────────
  if (!ancestor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>未找到长辈信息</Text>
      </SafeAreaView>
    );
  }

  if (!ancestor.death_date) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>暂无习俗日历</Text>
          <Text style={styles.emptyHint}>
            需要设置去世日期后才能生成习俗时间线。
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 渲染事件项 ───────────────────────────────────────
  const renderItem = ({ item, section }: { item: RitualEvent; section: Section }) => {
    const isPast = section.type === 'past';
    const isUpcoming = section.type === 'upcoming';

    // 倒计时文字
    let countdown = '';
    if (item.isPast) {
      countdown = `${Math.abs(item.daysFromNow)} 天前`;
    } else if (item.daysFromNow === 0) {
      countdown = '今天';
    } else {
      countdown = `还有 ${item.daysFromNow} 天`;
    }

    return (
      <Pressable
        style={[
          styles.eventItem,
          isPast && styles.eventItemPast,
          isUpcoming && styles.eventItemUpcoming,
        ]}
        onPress={() =>
          router.push(`/ancestors/${id}/rituals/${item.key}` as any)
        }
      >
        {/* 时间线圆点 */}
        <View
          style={[
            styles.dot,
            isPast && styles.dotPast,
            isUpcoming && styles.dotUpcoming,
          ]}
        />

        {/* 事件内容 */}
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text
              style={[
                styles.eventName,
                isPast && styles.eventNamePast,
              ]}
            >
              {item.name}
            </Text>
            <Text
              style={[
                styles.eventCountdown,
                isUpcoming && styles.eventCountdownUpcoming,
                isPast && styles.eventCountdownPast,
              ]}
            >
              {countdown}
            </Text>
          </View>
          <Text
            style={[
              styles.eventDate,
              isPast && styles.eventDatePast,
            ]}
          >
            {item.dateSolar}
            {item.dateLunar ? ` · ${item.dateLunar}` : ''}
          </Text>
        </View>

        {/* 箭头 */}
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    );
  };

  // ─── 渲染段落头 ───────────────────────────────────────
  const renderSectionHeader = ({ section }: { section: Section }) => {
    const isCollapsed = collapsedSections.has(section.type);
    return (
      <Pressable
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.type)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionChevron}>
            {isCollapsed ? '▸' : '▾'}
          </Text>
          <Text
            style={[
              styles.sectionTitle,
              section.type === 'upcoming' && styles.sectionTitleUpcoming,
              section.type === 'past' && styles.sectionTitlePast,
            ]}
          >
            {section.title}
          </Text>
          <View
            style={[
              styles.sectionBadge,
              section.type === 'upcoming' && styles.sectionBadgeUpcoming,
              section.type === 'past' && styles.sectionBadgePast,
            ]}
          >
            <Text
              style={[
                styles.sectionBadgeText,
                section.type === 'upcoming' && styles.sectionBadgeTextUpcoming,
              ]}
            >
              {section.data.length}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 顶部信息 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {ancestor.name} 的习俗日历
        </Text>
        <View style={styles.headerMeta}>
          {ancestor.death_date && (
            <Text style={styles.headerMetaText}>
              去世日期: {ancestor.death_date}
            </Text>
          )}
        </View>
      </View>

      {/* 时间线列表 */}
      <SectionList
        sections={sections.map((s) => ({
          ...s,
          data: collapsedSections.has(s.type) ? [] : s.data,
        }))}
        renderItem={renderItem}
        renderSectionHeader={({ section }) =>
          renderSectionHeader({ section: section as unknown as Section })
        }
        keyExtractor={(item) => item.key}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyHint}>暂无习俗事件</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── 样式 ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  errorText: {
    color: Colors.crimson,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },

  // ─── 空状态 ──────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.ink,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    color: Colors.inkMute,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ─── 顶部 ────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  headerMetaText: {
    color: Colors.inkMute,
    fontSize: 13,
  },

  // ─── 列表 ────────────────────────────────────
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },

  // ─── 段落头 ──────────────────────────────────
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionChevron: {
    color: Colors.inkMute,
    fontSize: 14,
    width: 16,
  },
  sectionTitle: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitleUpcoming: {
    color: Colors.vermilion,
  },
  sectionTitlePast: {
    color: Colors.inkMute,
  },
  sectionBadge: {
    backgroundColor: Colors.paperDark,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeUpcoming: {
    backgroundColor: '#FDE8E4',
  },
  sectionBadgePast: {
    backgroundColor: Colors.paperDark,
  },
  sectionBadgeText: {
    color: Colors.inkMute,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionBadgeTextUpcoming: {
    color: Colors.vermilion,
  },

  // ─── 事件项 ──────────────────────────────────
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.paper,
  },
  eventItemPast: {
    opacity: 0.6,
  },
  eventItemUpcoming: {
    backgroundColor: '#FFFCFB',
  },

  // 时间线圆点
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.inkMute,
    marginRight: 14,
  },
  dotPast: {
    backgroundColor: Colors.divider,
  },
  dotUpcoming: {
    backgroundColor: Colors.vermilion,
  },

  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventName: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '500',
  },
  eventNamePast: {
    color: Colors.inkMute,
  },
  eventCountdown: {
    color: Colors.inkLight,
    fontSize: 13,
  },
  eventCountdownUpcoming: {
    color: Colors.vermilion,
    fontWeight: '600',
  },
  eventCountdownPast: {
    color: Colors.inkMute,
  },
  eventDate: {
    color: Colors.inkMute,
    fontSize: 13,
  },
  eventDatePast: {
    color: Colors.inkMute,
  },

  arrow: {
    color: Colors.inkMute,
    fontSize: 20,
    fontWeight: '300',
    marginLeft: 8,
  },
});
