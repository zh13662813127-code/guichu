/**
 * 族谱树可视化页面
 * 纯 React Native View 实现，按 generation 分层排列
 * 支持纵向 + 横向滚动，带连接线
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
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

// ─── 常量 ───────────────────────────────────────────
const NODE_WIDTH = 96;
const NODE_GAP = 16;
const CONNECTOR_HEIGHT = 36;
const AVATAR_SIZE = 48;

/** 判断是否已离世 */
function isDeceased(a: Ancestor): boolean {
  return a.death_year != null || a.death_date != null;
}

// ─── 单个节点组件 ───────────────────────────────────

function TreeNode({ ancestor, onPress }: { ancestor: Ancestor; onPress: () => void }) {
  const deceased = isDeceased(ancestor);
  const hasSkill = !!ancestor.skill_content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nodeCard,
        {
          borderStyle: deceased ? 'dashed' : 'solid',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {/* 右上角：skill 绿点 */}
      {hasSkill && <View style={styles.skillDot} />}

      {/* 头像：有 avatar_path 用真实图片，否则用首字母 */}
      {ancestor.avatar_path ? (
        <Image
          source={{ uri: ancestor.avatar_path }}
          style={styles.avatarImage}
        />
      ) : (
        <AvatarCircle name={ancestor.name} size={AVATAR_SIZE} />
      )}

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

// ─── 层间连接线组件 ─────────────────────────────────
// 在两层之间绘制：先画一条竖线到中间横线高度，横线覆盖下层所有节点宽度，
// 再从横线下方分出竖线到每个下层节点上方

interface ConnectorProps {
  /** 上层节点数 */
  topCount: number;
  /** 下层节点数 */
  bottomCount: number;
}

function LayerConnector({ topCount, bottomCount }: ConnectorProps) {
  // 计算上层和下层各自的总宽度（含间距）
  const topWidth = topCount * NODE_WIDTH + (topCount - 1) * NODE_GAP;
  const bottomWidth = bottomCount * NODE_WIDTH + (bottomCount - 1) * NODE_GAP;
  const totalWidth = Math.max(topWidth, bottomWidth);

  // 上层中心 x 坐标
  const topOffsetX = (totalWidth - topWidth) / 2;
  // 下层中心 x 坐标
  const bottomOffsetX = (totalWidth - bottomWidth) / 2;

  // 上层所有节点的中心 x
  const topCenters: number[] = [];
  for (let i = 0; i < topCount; i++) {
    topCenters.push(topOffsetX + i * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH / 2);
  }

  // 下层所有节点的中心 x
  const bottomCenters: number[] = [];
  for (let i = 0; i < bottomCount; i++) {
    bottomCenters.push(bottomOffsetX + i * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH / 2);
  }

  // 横线覆盖范围：从最左 center 到最右 center（合并上下层）
  const allCenters = [...topCenters, ...bottomCenters];
  const lineLeft = Math.min(...allCenters);
  const lineRight = Math.max(...allCenters);

  const halfH = CONNECTOR_HEIGHT / 2;

  return (
    <View style={[styles.connectorArea, { width: totalWidth, height: CONNECTOR_HEIGHT }]}>
      {/* 从上层每个节点中心向下画竖线到中间横线 */}
      {topCenters.map((cx, idx) => (
        <View
          key={`tv-${idx}`}
          style={[
            styles.vLine,
            { left: cx - 1, top: 0, height: halfH },
          ]}
        />
      ))}

      {/* 中间横线 */}
      {lineLeft < lineRight && (
        <View
          style={[
            styles.hLine,
            { left: lineLeft, top: halfH - 1, width: lineRight - lineLeft },
          ]}
        />
      )}

      {/* 从中间横线向下画竖线到下层每个节点 */}
      {bottomCenters.map((cx, idx) => (
        <View
          key={`bv-${idx}`}
          style={[
            styles.vLine,
            { left: cx - 1, top: halfH, height: halfH },
          ]}
        />
      ))}
    </View>
  );
}

// ─── 主页面组件 ─────────────────────────────────────

export default function TreeScreen() {
  const router = useRouter();
  const { ancestors, isLoading, loadAncestors } = useAncestorStore();

  useEffect(() => {
    loadAncestors();
  }, []);

  // 按 generation 分层，generation 越大辈分越高放最上面
  const layers = useMemo(() => {
    if (ancestors.length === 0) return [];

    const genSet = new Set(ancestors.map((a) => a.generation));
    const sortedGens = Array.from(genSet).sort((a, b) => b - a);

    return sortedGens.map((gen) => ({
      generation: gen,
      members: ancestors.filter((a) => a.generation === gen),
    }));
  }, [ancestors]);

  // 空状态
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
                  <View style={styles.layerBadge}>
                    <Text style={styles.layerLabel}>
                      第 {layer.generation} 代
                    </Text>
                  </View>
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
                {layerIdx < layers.length - 1 && (
                  <LayerConnector
                    topCount={layer.members.length}
                    bottomCount={layers[layerIdx + 1].members.length}
                  />
                )}
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

// ─── 样式 ─────────────────────────────────────────────

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
    alignItems: 'center',
  },
  layerBadge: {
    backgroundColor: Colors.paperDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
    gap: NODE_GAP,
  },

  // 节点卡片
  nodeCard: {
    width: NODE_WIDTH,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    backgroundColor: Colors.paperDark,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: 12,
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

  // 头像图片
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
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

  // 连接线区域（绝对定位的子元素）
  connectorArea: {
    position: 'relative',
    alignSelf: 'center',
  },
  // 竖线
  vLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: Colors.divider,
  },
  // 横线
  hLine: {
    position: 'absolute',
    height: 2,
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
