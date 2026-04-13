/**
 * 家族灵位 — 宗祠灵堂式灵牌树状图
 * 按 generation 分组，远祖在上，近亲在下
 * 每个人用"灵牌"样式卡片展示
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
import { useRouter } from 'expo-router';
import { Plus, Camera } from 'lucide-react-native';
import { Colors } from '../../src/constants/colors';
import { useAncestorStore, type Ancestor } from '../../src/stores/ancestorStore';

// ─── 辈分标签文字 ────────────────────────────────────────
function generationLabel(gen: number): string {
  const labels = ['', '第一世', '第二世', '第三世', '第四世', '第五世', '第六世', '第七世', '第八世', '第九世', '第十世'];
  if (gen > 0 && gen < labels.length) return labels[gen];
  return `第${gen}世`;
}

// ─── 灵牌组件 ────────────────────────────────────────────
function SpiritTablet({ ancestor, onPress }: { ancestor: Ancestor; onPress: () => void }) {
  // 名字竖排
  const nameChars = ancestor.name.split('');
  const lifespan =
    ancestor.birth_year && ancestor.death_year
      ? `${ancestor.birth_year}-${ancestor.death_year}`
      : ancestor.birth_year
        ? `${ancestor.birth_year}-`
        : ancestor.death_year
          ? `?-${ancestor.death_year}`
          : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [tabletStyles.container, pressed && { opacity: 0.8 }]}
    >
      {/* 顶部朱砂装饰线 */}
      <View style={tabletStyles.topLine} />

      {/* 灵牌主体（仿木牌） */}
      <View style={tabletStyles.tablet}>
        {nameChars.map((char, i) => (
          <Text key={i} style={tabletStyles.nameChar}>
            {char}
          </Text>
        ))}
      </View>

      {/* 底部信息 */}
      {ancestor.relationship ? (
        <Text style={tabletStyles.relationship}>{ancestor.relationship}</Text>
      ) : null}
      {lifespan ? <Text style={tabletStyles.lifespan}>{lifespan}</Text> : null}
    </Pressable>
  );
}

const tabletStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.paperDark,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    minWidth: 80,
    maxWidth: 100,
  },
  topLine: {
    width: '80%',
    height: 2,
    backgroundColor: Colors.vermilion,
    borderRadius: 1,
    marginBottom: 6,
  },
  tablet: {
    backgroundColor: '#3D2C1E',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    minHeight: 60,
  },
  nameChar: {
    color: Colors.paper,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 4,
    lineHeight: 26,
  },
  relationship: {
    color: Colors.vermilion,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  lifespan: {
    color: Colors.inkMute,
    fontSize: 10,
    marginTop: 2,
  },
});

// ─── 辈分分隔线 ────────────────────────────────────────────
function GenerationDivider({ gen }: { gen: number }) {
  return (
    <View style={dividerStyles.container}>
      <View style={dividerStyles.line} />
      <Text style={dividerStyles.label}>{generationLabel(gen)}</Text>
      <View style={dividerStyles.line} />
    </View>
  );
}

const dividerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
  },
  label: {
    color: Colors.inkLight,
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
});

// ─── 辈分间连接线 ────────────────────────────────────────
function ConnectionLine() {
  return (
    <View style={{ alignItems: 'center', marginVertical: 4 }}>
      <View style={{ width: 1, height: 16, backgroundColor: Colors.divider }} />
    </View>
  );
}

// ─── 主页面 ──────────────────────────────────────────────
export default function AncestorsScreen() {
  const router = useRouter();
  const { ancestors, isLoading, loadAncestors } = useAncestorStore();

  useEffect(() => {
    loadAncestors();
  }, []);

  // 按 generation 分组，从大到小排列（远祖在上）
  const generationGroups = useMemo(() => {
    if (ancestors.length === 0) return [];

    const grouped: Record<number, Ancestor[]> = {};
    for (const a of ancestors) {
      const gen = a.generation || 1;
      if (!grouped[gen]) grouped[gen] = [];
      grouped[gen].push(a);
    }

    // 按 generation 从大到小排序
    const sortedGens = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => b - a);

    return sortedGens.map((gen) => ({
      generation: gen,
      ancestors: grouped[gen],
    }));
  }, [ancestors]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => router.push('/ancestors/new' as any)}
        >
          <Plus color={Colors.paper} size={16} />
          <Text style={styles.addBtnText}>添加长辈</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/ancestors/scan' as any)}
        >
          <Camera color={Colors.vermilion} size={16} />
          <Text style={styles.scanBtnText}>AI 识别</Text>
        </Pressable>

        <Text style={styles.headerTitle}>家族灵位</Text>
      </View>

      {/* 内容区 */}
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 诗句 */}
          <Text style={styles.motto}>慎终追远，民德归厚矣</Text>

          {/* 按辈分渲染灵牌 */}
          {generationGroups.map((group, groupIdx) => (
            <View key={group.generation}>
              {/* 辈分间连接线（非第一组才显示） */}
              {groupIdx > 0 && <ConnectionLine />}

              {/* 辈分标签 */}
              <GenerationDivider gen={group.generation} />

              {/* 同辈灵牌横向排列 */}
              <View style={styles.tabletRow}>
                {group.ancestors.map((ancestor) => (
                  <SpiritTablet
                    key={ancestor.id}
                    ancestor={ancestor}
                    onPress={() => router.push(`/ancestors/${ancestor.id}` as any)}
                  />
                ))}
              </View>
            </View>
          ))}

          {/* 底部添加按钮 */}
          <Pressable
            style={({ pressed }) => [styles.bottomAdd, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/ancestors/new' as any)}
          >
            <Plus color={Colors.inkMute} size={18} />
            <Text style={styles.bottomAddText}>添加更多长辈</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── 样式 ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.vermilion,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    gap: 4,
  },
  addBtnPressed: { backgroundColor: Colors.vermilionPressed },
  addBtnText: { color: Colors.paper, fontSize: 13, fontWeight: '600' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paperDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.vermilion,
  },
  scanBtnText: { color: Colors.vermilion, fontSize: 13, fontWeight: '600' },
  headerTitle: { color: Colors.ink, fontSize: 20, fontWeight: '700', marginLeft: 'auto' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // 诗句
  motto: {
    color: Colors.inkLight,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
    fontStyle: 'italic',
    letterSpacing: 2,
  },

  // 滚动区域
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // 灵牌横向排列
  tabletRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },

  // 底部添加
  bottomAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  bottomAddText: { color: Colors.inkMute, fontSize: 14 },

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
