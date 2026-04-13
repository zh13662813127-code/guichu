/**
 * 寻路指南查看页 — 户外轨迹 App 风格
 * 参考两步路/咕咚的轨迹详情页设计
 *
 * 状态 A：没有路线数据 → 引导记录
 * 状态 B：有路线数据 → 轨迹统计仪表盘 + 竖向时间轴 + 步进寻路模式
 *
 * MVP 阶段路线数据用 useState 模拟，预留 DB 接口
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { TrackStats } from '../../../src/components/TrackStats';
import { navigateToLocation } from '../../../src/features/grave-pin/useNavigate';

/* ------------------------------------------------------------------ */
/*  数据结构                                                           */
/* ------------------------------------------------------------------ */

/** 路线点数据结构（预留 DB 接口） */
interface RoutePoint {
  id: string;
  order: number;
  label: string;
  note: string;
  /** GPS 纬度 */
  latitude: number;
  /** GPS 经度 */
  longitude: number;
  /** 图片路径（MVP 阶段为 null） */
  imagePath: string | null;
  /** 距离下一个点的大约米数 */
  distanceToNext: number | null;
}

/** 模拟路线数据（用于演示） */
const MOCK_ROUTE: RoutePoint[] = [
  {
    id: '1',
    order: 1,
    label: '起点 · 村口',
    note: '到村口后朝北走',
    latitude: 30.274,
    longitude: 120.155,
    imagePath: null,
    distanceToNext: 200,
  },
  {
    id: '2',
    order: 2,
    label: '大柳树岔路口',
    note: '看到大柳树右转',
    latitude: 30.276,
    longitude: 120.156,
    imagePath: null,
    distanceToNext: 150,
  },
  {
    id: '3',
    order: 3,
    label: '终点',
    note: '红砖房后面山坡上',
    latitude: 30.278,
    longitude: 120.158,
    imagePath: null,
    distanceToNext: null,
  },
];

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

/** 计算总距离（米） */
function calcTotalDistance(points: RoutePoint[]): number {
  return points.reduce((sum, p) => sum + (p.distanceToNext ?? 0), 0);
}

/** 按步行速度 80m/min 计算预计时间（分钟） */
function calcEstimatedMinutes(totalMeters: number): number {
  return totalMeters / 80;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

/* ------------------------------------------------------------------ */
/*  步进寻路模式                                                       */
/* ------------------------------------------------------------------ */

function StepNavigator({
  points,
  visible,
  onClose,
}: {
  points: RoutePoint[];
  visible: boolean;
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const point = points[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === points.length - 1;
  const progress = (currentStep + 1) / points.length;

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  const handleNext = () => {
    if (isLast) {
      onClose();
      setCurrentStep(0);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  if (!point) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={stepStyles.container}>
        {/* 顶部进度条 */}
        <View style={stepStyles.progressBarBg}>
          <View
            style={[stepStyles.progressBarFill, { width: `${progress * 100}%` as any }]}
          />
        </View>

        {/* 头部：步骤计数 + 关闭 */}
        <View style={stepStyles.header}>
          <Text style={stepStyles.counter}>
            第 {currentStep + 1} 步 / 共 {points.length} 步
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={stepStyles.close}>关闭</Text>
          </Pressable>
        </View>

        {/* 大图区域 */}
        <View style={stepStyles.imageBox}>
          {point.imagePath ? (
            <Image
              source={{ uri: point.imagePath }}
              style={stepStyles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={stepStyles.imagePlaceholder}>
              <Text style={stepStyles.imagePlaceholderIcon}>
                {isLast ? '📍' : '📷'}
              </Text>
              <Text style={stepStyles.imagePlaceholderText}>暂无图片</Text>
            </View>
          )}
        </View>

        {/* 路线点信息 */}
        <View style={stepStyles.info}>
          <Text style={stepStyles.label}>
            {isLast ? '📍 终点' : `${point.order}. ${point.label}`}
          </Text>
          <Text style={stepStyles.note}>"{point.note}"</Text>
          {point.distanceToNext != null && (
            <Text style={stepStyles.distance}>
              距下一个点约 {point.distanceToNext}m
            </Text>
          )}
        </View>

        {/* 到达提示（最后一步） */}
        {isLast && currentStep === points.length - 1 && (
          <View style={stepStyles.arrivalBanner}>
            <Text style={stepStyles.arrivalEmoji}>🎉🧨</Text>
            <Text style={stepStyles.arrivalText}>再走一小段就到了！</Text>
          </View>
        )}

        {/* 底部导航箭头 */}
        <View style={stepStyles.navRow}>
          <Pressable
            onPress={handlePrev}
            disabled={isFirst}
            style={[stepStyles.arrowBtn, isFirst && stepStyles.arrowBtnDisabled]}
          >
            <Text
              style={[
                stepStyles.arrowText,
                isFirst && stepStyles.arrowTextDisabled,
              ]}
            >
              ←
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNext}
            style={stepStyles.arrowBtnPrimary}
          >
            <Text style={stepStyles.arrowPrimaryText}>
              {isLast ? '🎉 你到了' : '→'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  主页面                                                             */
/* ------------------------------------------------------------------ */

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // MVP：用 state 模拟路线数据
  // 设为空数组可查看 "状态 A"，设为 MOCK_ROUTE 可查看 "状态 B"
  const [routePoints] = useState<RoutePoint[]>(MOCK_ROUTE);
  const [stepMode, setStepMode] = useState(false);

  const hasRoute = routePoints.length > 0;

  // 轨迹统计数据
  const totalDistance = useMemo(() => calcTotalDistance(routePoints), [routePoints]);
  const estimatedMinutes = useMemo(
    () => calcEstimatedMinutes(totalDistance),
    [totalDistance],
  );

  /** 导航到起点 */
  const handleNavigateStart = useCallback(() => {
    if (routePoints.length === 0) return;
    const start = routePoints[0];
    navigateToLocation({
      latitude: start.latitude,
      longitude: start.longitude,
      name: start.label,
    });
  }, [routePoints]);

  /** 导航到终点 */
  const handleNavigateEnd = useCallback(() => {
    if (routePoints.length === 0) return;
    const end = routePoints[routePoints.length - 1];
    navigateToLocation({
      latitude: end.latitude,
      longitude: end.longitude,
      name: end.label,
    });
  }, [routePoints]);

  /* ---- 状态 A：没有路线数据 ---- */
  if (!hasRoute) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <Text style={styles.pageTitle}>🗺️ 寻路指南</Text>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🥾</Text>
            <Text style={styles.emptyTitle}>还没有记录路线</Text>
            <Text style={styles.emptyHint}>
              像户外徒步一样{'\n'}
              从村口走到墓地时，沿途拍照记录路线点
            </Text>
            <PrimaryButton
              title="开始记录路线"
              onPress={() =>
                router.push(`/ancestors/${id}/route-record` as any)
              }
              style={{ marginTop: 24, width: '100%' }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---- 状态 B：有路线数据 ---- */
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StepNavigator
        points={routePoints}
        visible={stepMode}
        onClose={() => setStepMode(false)}
      />

      <ScrollView
        contentContainerStyle={styles.routeContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 页面标题 */}
        <Text style={styles.pageTitle}>🗺️ 去墓地的路线</Text>

        {/* 轨迹统计仪表盘 */}
        <TrackStats
          totalDistance={totalDistance}
          waypointCount={routePoints.length}
          estimatedMinutes={estimatedMinutes}
        />

        {/* 路线详情标题 */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionTitle}>路线详情</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* 竖向时间轴 */}
        <View style={styles.timeline}>
          {routePoints.map((point, idx) => {
            const isLast = idx === routePoints.length - 1;
            const isFirstPoint = idx === 0;
            return (
              <View key={point.id}>
                {/* 路线点行 */}
                <View style={styles.timelineRow}>
                  {/* 左侧：竖线 + 序号圆 */}
                  <View style={styles.timelineLeft}>
                    {/* 上半竖线（第一个点不显示） */}
                    <View
                      style={[
                        styles.timelineLineTop,
                        isFirstPoint && styles.timelineLineHidden,
                      ]}
                    />
                    {/* 序号圆 */}
                    <View
                      style={[
                        styles.timelineBadge,
                        isLast && styles.timelineBadgeEnd,
                      ]}
                    >
                      <Text style={styles.timelineBadgeText}>
                        {isLast ? '📍' : `${point.order}`}
                      </Text>
                    </View>
                    {/* 下半竖线（最后一个点不显示） */}
                    <View
                      style={[
                        styles.timelineLineBottom,
                        isLast && styles.timelineLineHidden,
                      ]}
                    />
                  </View>

                  {/* 右侧：路线点卡片 */}
                  <View style={styles.timelineCard}>
                    {/* 标签名 */}
                    <Text style={styles.cardLabel}>
                      {isLast ? '终点' : point.label}
                      {isFirstPoint && !isLast ? '  起点' : ''}
                    </Text>

                    {/* 图片缩略图 + 备注 */}
                    <View style={styles.cardBody}>
                      {/* 缩略图 */}
                      <View style={styles.thumbnail}>
                        {point.imagePath ? (
                          <Image
                            source={{ uri: point.imagePath }}
                            style={styles.thumbnailImage}
                          />
                        ) : (
                          <Text style={styles.thumbnailPlaceholder}>📷</Text>
                        )}
                      </View>
                      {/* 备注 + 坐标 */}
                      <View style={styles.cardMeta}>
                        <Text style={styles.cardNote}>"{point.note}"</Text>
                        <Text style={styles.cardCoord}>
                          📍 {point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 距离标注（在两个路线点之间） */}
                {point.distanceToNext != null && (
                  <View style={styles.timelineDistanceRow}>
                    <View style={styles.timelineLeft}>
                      <View style={styles.timelineLineFull} />
                    </View>
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceBadgeText}>
                        ↕ {point.distanceToNext}m
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 底部按钮区 */}
      <View style={styles.bottomBar}>
        <View style={styles.navButtons}>
          <Pressable style={styles.navBtn} onPress={handleNavigateStart}>
            <Text style={styles.navBtnText}>🧭 导航起点</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={handleNavigateEnd}>
            <Text style={styles.navBtnText}>🧭 导航终点</Text>
          </Pressable>
        </View>
        <PrimaryButton
          title="🚶 开始寻路（步进模式）"
          onPress={() => setStepMode(true)}
        />
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  主页面样式                                                         */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },

  /* 页面标题 */
  pageTitle: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },

  /* 状态 A — 空状态 */
  emptyContent: {
    flex: 1,
    padding: 16,
  },
  emptyCard: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyHint: {
    color: Colors.inkMute,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },

  /* 状态 B — 路线列表 */
  routeContent: {
    padding: 16,
    paddingBottom: 200,
  },

  /* 路线详情分割线标题 */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  sectionTitle: {
    color: Colors.inkLight,
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 12,
  },

  /* ========== 竖向时间轴 ========== */
  timeline: {
    paddingLeft: 4,
  },

  /* 路线点行 */
  timelineRow: {
    flexDirection: 'row',
  },

  /* 左侧竖线列 */
  timelineLeft: {
    width: 36,
    alignItems: 'center',
  },
  timelineLineTop: {
    width: 2,
    height: 12,
    backgroundColor: Colors.divider,
  },
  timelineLineBottom: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.divider,
  },
  timelineLineFull: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.divider,
  },
  timelineLineHidden: {
    backgroundColor: 'transparent',
  },

  /* 序号圆 */
  timelineBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBadgeEnd: {
    backgroundColor: Colors.crimson,
  },
  timelineBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* 右侧路线点卡片 */
  timelineCard: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 4,
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    padding: 12,
  },
  cardLabel: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBody: {
    flexDirection: 'row',
  },

  /* 缩略图 */
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 80,
    height: 80,
  },
  thumbnailPlaceholder: {
    fontSize: 28,
    opacity: 0.4,
  },

  /* 备注 + 坐标 */
  cardMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  cardNote: {
    color: Colors.inkLight,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 6,
  },
  cardCoord: {
    color: Colors.inkMute,
    fontSize: 12,
  },

  /* 距离标注行 */
  timelineDistanceRow: {
    flexDirection: 'row',
    height: 36,
  },
  distanceBadge: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  distanceBadgeText: {
    color: Colors.inkMute,
    fontSize: 12,
    fontWeight: '500',
  },

  /* 底部按钮区 */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.paper,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  navBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '600',
  },
});

/* ------------------------------------------------------------------ */
/*  步进模式样式                                                       */
/* ------------------------------------------------------------------ */

const stepStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },

  /* 顶部进度条 */
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.divider,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.vermilion,
    borderRadius: 2,
  },

  /* 头部 */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  counter: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  close: {
    color: Colors.vermilion,
    fontSize: 15,
    fontWeight: '600',
  },

  /* 大图区域 */
  imageBox: {
    marginHorizontal: 16,
    height: SCREEN_WIDTH - 32,
    maxHeight: 360,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.paperDark,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    color: Colors.inkMute,
    fontSize: 14,
  },

  /* 路线点信息 */
  info: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  note: {
    color: Colors.inkLight,
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  distance: {
    color: Colors.inkMute,
    fontSize: 14,
  },

  /* 到达提示 */
  arrivalBanner: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  arrivalEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  arrivalText: {
    color: Colors.vermilion,
    fontSize: 16,
    fontWeight: '600',
  },

  /* 底部箭头按钮 */
  navRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  arrowBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 24,
    color: Colors.ink,
  },
  arrowTextDisabled: {
    color: Colors.inkMute,
  },
  arrowBtnPrimary: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPrimaryText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
