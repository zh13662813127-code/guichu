/**
 * 族谱树可视化页面
 * 纯 React Native View 实现，按 generation 分层排列
 * 支持纵向 + 横向滚动
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { useAncestorStore, type Ancestor } from '../src/stores/ancestorStore';
import { AvatarCircle } from '../src/components/AvatarCircle';
import { PrimaryButton } from '../src/components/PrimaryButton';

/** 根据性别决定节点卡片圆角 */
function getNodeBorderRadius(gender: Ancestor['gender']): number {
  switch (gender) {
    case 'male':
      return 8; // rounded-md
    case 'female':
      return 999; // rounded-full（圆形）
    default:
      return 16; // rounded-lg（八边形近似）
  }
}

/** 判断是否已离世 */
function isDeceased(a: Ancestor): boolean {
  return a.death_year != null || a.death_date != null;
}

/**
 * 单个节点组件
 */
function TreeNode({ ancestor, onPress }: { ancestor: Ancestor; onPress: () => void }) {
  const borderRadius = getNodeBorderRadius(ancestor.gender);
  const deceased = isDeceased(ancestor);
  const hasSkill = !!ancestor.skill_content;
  const hasVoice = !!ancestor.voice_id;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nodeCard,
        {
          borderRadius,
          borderStyle: deceased ? 'dashed' : 'solid',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {/* 右上角：skill 绿点 */}
      {hasSkill && <View style={styles.skillDot} />}
      {/* 右下角：voice 喇叭 */}
      {hasVoice && (
        <View style={styles.voiceBadge}>
          <Text style={styles.voiceIcon}>🔊</Text>
        </View>
      )}

      <AvatarCircle name={ancestor.name} size={40} />
      <Text style={styles.nodeName} numberOfLines={1}>
        {ancestor.name}
      </Text>
      {ancestor.relationship && (
        <Text style={styles.nodeRelation} numberOfLines={1}>
          {ancestor.relationship}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * 层间竖线连接组件
 */
function ConnectorLine() {
  return (
    <View style={styles.connectorContainer}>
      <View style={styles.connectorLine} />
    </View>
  );
}

export default function TreeScreen() {
  const router = useRouter();
  const { ancestors, isLoading, loadAncestors } = useAncestorStore();

  useEffect(() => {
    loadAncestors();
  }, []);

  // 按 generation 分层，generation 越大辈分越高放最上面
  const layers = useMemo(() => {
    if (ancestors.length === 0) return [];

    // 收集所有 generation 值并降序排列
    const genSet = new Set(ancestors.map((a) => a.generation));
    const sortedGens = Array.from(genSet).sort((a, b) => b - a);

    return sortedGens.map((gen) => ({
      generation: gen,
      members: ancestors.filter((a) => a.generation === gen),
    }));
  }, [ancestors]);

  /** 空状态 */
  if (!isLoading && ancestors.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>族谱</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌳</Text>
          <Text style={styles.emptyTitle}>还没有家人</Text>
          <Text style={styles.emptyHint}>
            添加第一位长辈，开始构建你的家族树
          </Text>
          <PrimaryButton
            title="添加第一位家人"
            onPress={() => router.push('/ancestors/new' as any)}
            style={{ marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>族谱</Text>
        <Text style={styles.subtitle}>
          共 {ancestors.length} 位家人 · {layers.length} 代
        </Text>
      </View>

      {/* 双向可滚动的族谱树 */}
      <ScrollView
        style={styles.scrollV}
        contentContainerStyle={styles.scrollVContent}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          contentContainerStyle={styles.scrollHContent}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.treeContainer}>
            {layers.map((layer, layerIdx) => (
              <React.Fragment key={layer.generation}>
                {/* 层标题 */}
                <View style={styles.layerHeader}>
                  <Text style={styles.layerLabel}>
                    第 {layer.generation} 代
                  </Text>
                </View>

                {/* 该层节点水平排列 */}
                <View style={styles.layerRow}>
                  {layer.members.map((ancestor) => (
                    <TreeNode
                      key={ancestor.id}
                      ancestor={ancestor}
                      onPress={() =>
                        router.push(`/ancestors/${ancestor.id}` as any)
                      }
                    />
                  ))}
                </View>

                {/* 层间连接线（最后一层不画） */}
                {layerIdx < layers.length - 1 && <ConnectorLine />}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* 底部浮动添加按钮 */}
      <View style={styles.fabContainer}>
        <PrimaryButton
          title="+ 添加家人"
          onPress={() => router.push('/ancestors/new' as any)}
        />
      </View>
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
  subtitle: {
    color: Colors.inkLight,
    fontSize: 14,
    marginTop: 4,
  },

  // 滚动容器
  scrollV: {
    flex: 1,
  },
  scrollVContent: {
    paddingBottom: 100,
  },
  scrollHContent: {
    paddingHorizontal: 16,
  },

  // 树容器
  treeContainer: {
    alignItems: 'center',
    minWidth: '100%',
  },

  // 层标题
  layerHeader: {
    marginBottom: 8,
  },
  layerLabel: {
    color: Colors.inkMute,
    fontSize: 12,
    fontWeight: '500',
  },

  // 层内节点行
  layerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: 12,
  },

  // 节点卡片
  nodeCard: {
    width: 90,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    backgroundColor: Colors.paperDark,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    position: 'relative',
  },
  nodeName: {
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  nodeRelation: {
    color: Colors.inkMute,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },

  // skill 绿点（右上角）
  skillDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.jade,
  },

  // voice 喇叭（右下角）
  voiceBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  voiceIcon: {
    fontSize: 10,
  },

  // 层间连接线
  connectorContainer: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
  },
  connectorLine: {
    width: 2,
    height: 28,
    backgroundColor: Colors.divider,
  },

  // 空状态
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.ink,
    fontSize: 20,
    fontWeight: '600',
  },
  emptyHint: {
    color: Colors.inkMute,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },

  // 底部浮动按钮
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
  },
});
