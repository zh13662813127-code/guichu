/**
 * 长辈列表页
 * 纵向卡片排列，每张卡片显示头像+名字+关系+下一个重要节日
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, ChevronRight, Calendar } from 'lucide-react-native';
import { Colors } from '../../src/constants/colors';
import { useAncestorStore, type Ancestor } from '../../src/stores/ancestorStore';
import { AvatarCircle } from '../../src/components/AvatarCircle';
import { calculateRituals } from '../../src/features/rituals/calcRituals';

/** 获取某位长辈下一个即将到来的习俗事件 */
function getNextRitual(ancestor: Ancestor): { name: string; daysFromNow: number } | null {
  if (!ancestor.death_date) return null;
  try {
    const events = calculateRituals(ancestor.death_date);
    const upcoming = events.filter((e) => !e.isPast);
    if (upcoming.length === 0) return null;
    return { name: upcoming[0].name, daysFromNow: upcoming[0].daysFromNow };
  } catch {
    return null;
  }
}

/** 生卒年显示 */
function formatLifespan(a: Ancestor): string {
  const birth = a.birth_year ? `${a.birth_year}` : '?';
  const death = a.death_year
    ? `${a.death_year}`
    : a.death_date
    ? a.death_date.split('-')[0]
    : '健在';
  return `${birth} — ${death}`;
}

/** 倒计时文字 */
function countdownText(days: number): string {
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  return `${days}天后`;
}

export default function AncestorsScreen() {
  const router = useRouter();
  const { ancestors, isLoading, loadAncestors } = useAncestorStore();

  useEffect(() => {
    loadAncestors();
  }, []);

  // 为每位长辈计算下一个节日
  const ancestorsWithRitual = useMemo(() => {
    return ancestors.map((a) => ({
      ancestor: a,
      nextRitual: getNextRitual(a),
    }));
  }, [ancestors]);

  const renderCard = ({ item }: { item: (typeof ancestorsWithRitual)[0] }) => {
    const { ancestor, nextRitual } = item;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/ancestors/${ancestor.id}` as any)}
      >
        {/* 左：头像 */}
        <AvatarCircle name={ancestor.name} size={56} />

        {/* 中：基本信息 */}
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            {ancestor.relationship && (
              <Text style={styles.cardRelation}>{ancestor.relationship}</Text>
            )}
            <Text style={styles.cardName}>{ancestor.name}</Text>
          </View>
          <Text style={styles.cardLifespan}>{formatLifespan(ancestor)}</Text>
        </View>

        {/* 右：下一个节日 + 箭头 */}
        <View style={styles.cardRight}>
          {nextRitual ? (
            <View style={styles.ritualInfo}>
              <View style={styles.ritualRow}>
                <Calendar color={Colors.vermilion} size={13} />
                <Text style={styles.ritualName} numberOfLines={1}>{nextRitual.name}</Text>
              </View>
              <Text style={styles.ritualCountdown}>{countdownText(nextRitual.daysFromNow)}</Text>
            </View>
          ) : (
            <Text style={styles.noRitual}>暂无提醒</Text>
          )}
          <ChevronRight color={Colors.inkMute} size={18} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => router.push('/ancestors/new' as any)}
        >
          <Plus color={Colors.paper} size={18} />
          <Text style={styles.addBtnText}>添加长辈</Text>
        </Pressable>
        <Text style={styles.headerTitle}>我的长辈</Text>
      </View>

      {/* 列表 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.vermilion} size="large" />
        </View>
      ) : ancestors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Pressable
            style={({ pressed }) => [styles.emptyCard, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/ancestors/new' as any)}
          >
            <View style={styles.emptyCircle}>
              <Plus color={Colors.inkMute} size={32} />
            </View>
            <Text style={styles.emptyTitle}>添加你的第一位家人</Text>
            <Text style={styles.emptyHint}>记录他们的故事，留住珍贵的记忆</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={ancestorsWithRitual}
          keyExtractor={(item) => item.ancestor.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderCard}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.vermilion,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 4,
  },
  addBtnPressed: { backgroundColor: Colors.vermilionPressed },
  addBtnText: { color: Colors.paper, fontSize: 14, fontWeight: '600' },
  headerTitle: { color: Colors.ink, fontSize: 20, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  // 卡片
  card: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPressed: { opacity: 0.85 },
  cardInfo: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardRelation: {
    color: Colors.paper,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: Colors.vermilion,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  cardName: { color: Colors.ink, fontSize: 17, fontWeight: '600' },
  cardLifespan: { color: Colors.inkLight, fontSize: 13 },
  // 右侧节日
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  ritualInfo: { alignItems: 'flex-end' },
  ritualRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ritualName: { color: Colors.vermilion, fontSize: 12, fontWeight: '500', maxWidth: 80 },
  ritualCountdown: { color: Colors.inkLight, fontSize: 11, marginTop: 2 },
  noRitual: { color: Colors.inkMute, fontSize: 12 },
  // 空状态
  emptyContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  emptyCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: Colors.inkLight, fontSize: 17, fontWeight: '500' },
  emptyHint: { color: Colors.inkMute, fontSize: 14, marginTop: 8 },
});
