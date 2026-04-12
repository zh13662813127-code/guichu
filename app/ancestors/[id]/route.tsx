/**
 * 寻路指南查看页
 * 状态 A：没有路线数据 → 引导记录
 * 状态 B：有路线数据 → 竖向图文列表 + 步进模式
 *
 * MVP 阶段路线数据用 useState 模拟，预留 DB 接口
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { navigateToLocation } from '../../../src/features/grave-pin/useNavigate';

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

/** 步进模式组件 */
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
  const screenWidth = Dimensions.get('window').width;

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
      <SafeAreaView style={styles.stepContainer}>
        {/* 顶部关闭按钮 */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepCounter}>
            {currentStep + 1} / {points.length}
          </Text>
          <Pressable onPress={onClose}>
            <Text style={styles.stepClose}>关闭</Text>
          </Pressable>
        </View>

        {/* 大图片占位 */}
        <View style={[styles.stepImage, { width: screenWidth - 32 }]}>
          <Text style={styles.imagePlaceholderText}>
            {point.imagePath ? '图片加载中...' : '暂无图片'}
          </Text>
        </View>

        {/* 路线点信息 */}
        <View style={styles.stepInfo}>
          <Text style={styles.stepLabel}>
            {isLast ? '📍 ' : `${point.order}. `}
            {point.label}
          </Text>
          <Text style={styles.stepNote}>{point.note}</Text>
        </View>

        {/* 底部按钮 */}
        <View style={styles.stepButtons}>
          <Pressable
            onPress={handlePrev}
            disabled={isFirst}
            style={[styles.stepBtn, isFirst && styles.stepBtnDisabled]}
          >
            <Text
              style={[
                styles.stepBtnText,
                isFirst && styles.stepBtnTextDisabled,
              ]}
            >
              ← 上一步
            </Text>
          </Pressable>
          <Pressable onPress={handleNext} style={styles.stepBtnPrimary}>
            <Text style={styles.stepBtnPrimaryText}>
              {isLast ? '你到了' : '下一步 →'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // MVP：用 state 模拟路线数据
  // 设为空数组可查看 "状态 A"，设为 MOCK_ROUTE 可查看 "状态 B"
  const [routePoints] = useState<RoutePoint[]>(MOCK_ROUTE);

  const [stepMode, setStepMode] = useState(false);

  const hasRoute = routePoints.length > 0;

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

  /** 状态 A：没有路线数据 */
  if (!hasRoute) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <Text style={styles.pageTitle}>寻路指南</Text>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>还没有记录路线</Text>
            <Text style={styles.emptyHint}>
              从村口走到墓地时{'\n'}沿途拍照记录路线点
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

  /** 状态 B：有路线数据 */
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
        <Text style={styles.pageTitle}>寻路指南</Text>
        <Text style={styles.routeSummary}>
          共 {routePoints.length} 个路线点
        </Text>

        {/* 竖向图文列表 */}
        {routePoints.map((point, idx) => {
          const isLast = idx === routePoints.length - 1;
          return (
            <View key={point.id} style={styles.pointItem}>
              {/* 序号标记 */}
              <View style={styles.pointHeader}>
                <View style={styles.pointBadge}>
                  <Text style={styles.pointBadgeText}>
                    {isLast ? '📍' : `${point.order}`}
                  </Text>
                </View>
                <Text style={styles.pointLabel}>
                  {isLast ? `终点` : point.label}
                </Text>
              </View>

              {/* 图片占位框 */}
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>
                  {point.imagePath ? '图片加载中...' : '暂无图片'}
                </Text>
              </View>

              {/* 备注 */}
              <View style={styles.noteRow}>
                <Text style={styles.noteIcon}>📝</Text>
                <Text style={styles.noteText}>"{point.note}"</Text>
              </View>

              {/* 距离指示 */}
              {point.distanceToNext != null && (
                <View style={styles.distanceRow}>
                  <View style={styles.distanceLine} />
                  <Text style={styles.distanceText}>
                    ↓ 约 {point.distanceToNext} 米
                  </Text>
                  <View style={styles.distanceLine} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* 底部按钮区 */}
      <View style={styles.bottomBar}>
        <View style={styles.navButtons}>
          <Pressable style={styles.navBtn} onPress={handleNavigateStart}>
            <Text style={styles.navBtnText}>🧭 导航到起点</Text>
          </Pressable>
          <Pressable style={styles.navBtn} onPress={handleNavigateEnd}>
            <Text style={styles.navBtnText}>🧭 导航到终点</Text>
          </Pressable>
        </View>
        <PrimaryButton
          title="🚶 开始寻路"
          onPress={() => setStepMode(true)}
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

  // 页面标题
  pageTitle: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeSummary: {
    color: Colors.inkMute,
    fontSize: 14,
    marginBottom: 20,
  },

  // 状态 A — 空状态
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

  // 状态 B — 路线列表
  routeContent: {
    padding: 16,
    paddingBottom: 200,
  },

  // 路线点卡片
  pointItem: {
    marginBottom: 8,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pointBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pointLabel: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },

  // 图片占位框
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.paperDark,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imagePlaceholderText: {
    color: Colors.inkMute,
    fontSize: 14,
  },

  // 备注行
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 2,
  },
  noteText: {
    color: Colors.inkLight,
    fontSize: 14,
    fontStyle: 'italic',
    flex: 1,
  },

  // 距离指示
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  distanceLine: {
    height: 1,
    flex: 1,
    backgroundColor: Colors.divider,
  },
  distanceText: {
    color: Colors.inkMute,
    fontSize: 13,
    marginHorizontal: 12,
  },

  // 底部按钮区
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

  // 步进模式
  stepContainer: {
    flex: 1,
    backgroundColor: Colors.paper,
    padding: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCounter: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  stepClose: {
    color: Colors.vermilion,
    fontSize: 15,
    fontWeight: '600',
  },
  stepImage: {
    height: 240,
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepInfo: {
    flex: 1,
    paddingHorizontal: 4,
  },
  stepLabel: {
    color: Colors.ink,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepNote: {
    color: Colors.inkLight,
    fontSize: 16,
    lineHeight: 24,
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 16,
  },
  stepBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  stepBtnTextDisabled: {
    color: Colors.inkMute,
  },
  stepBtnPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
