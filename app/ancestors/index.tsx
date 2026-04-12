/**
 * 长辈列表页
 * 从 SQLite 查询所有长辈，显示为卡片列表
 */

import React, { useEffect } from 'react';
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
import { Plus, User } from 'lucide-react-native';
import { Colors } from '../../src/constants/colors';
import { useAncestorStore } from '../../src/stores/ancestorStore';
import type { Ancestor } from '../../src/db/queries/ancestors';

/** 关系标签映射（英文 -> 中文，方便显示） */
const GENDER_LABEL: Record<string, string> = {
  male: '男',
  female: '女',
};

/** 生卒年显示 */
function formatLifespan(ancestor: Ancestor): string {
  const birth = ancestor.birth_year ? `${ancestor.birth_year}` : '?';
  if (ancestor.death_year) {
    return `${birth} — ${ancestor.death_year}`;
  }
  if (ancestor.death_date) {
    return `${birth} — ${ancestor.death_date.split('-')[0]}`;
  }
  return `${birth} — 健在`;
}

/** 单个长辈卡片 */
function AncestorCard({
  ancestor,
  onPress,
}: {
  ancestor: Ancestor;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* 头像占位圆 */}
      <View style={styles.avatar}>
        <User color={Colors.inkMute} size={24} />
      </View>

      {/* 信息区 */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{ancestor.name}</Text>
        <View style={styles.cardMeta}>
          {ancestor.relationship && (
            <Text style={styles.cardRelation}>{ancestor.relationship}</Text>
          )}
          <Text style={styles.cardLifespan}>
            {formatLifespan(ancestor)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function AncestorsScreen() {
  const router = useRouter();
  const { ancestors, isLoading, loadAncestors } = useAncestorStore();

  useEffect(() => {
    loadAncestors();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>长辈</Text>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() => router.push('/ancestors/new' as any)}
        >
          <Plus color={Colors.paper} size={20} />
        </Pressable>
      </View>

      {/* 列表 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.vermilion} size="large" />
        </View>
      ) : ancestors.length === 0 ? (
        /* 空状态 */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              还没有添加长辈
            </Text>
            <Text style={styles.emptyHint}>
              点击右上角 + 添加你的第一位家人
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={ancestors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AncestorCard
              ancestor={item}
              onPress={() => router.push(`/ancestors/${item.id}` as any)}
            />
          )}
        />
      )}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    backgroundColor: Colors.vermilionPressed,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  // 卡片
  card: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardRelation: {
    color: Colors.vermilion,
    fontSize: 13,
    fontWeight: '500',
  },
  cardLifespan: {
    color: Colors.inkLight,
    fontSize: 13,
  },
  // 空状态
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  emptyCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.inkLight,
    fontSize: 17,
    textAlign: 'center',
  },
  emptyHint: {
    color: Colors.inkMute,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
