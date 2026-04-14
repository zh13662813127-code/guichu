/**
 * 香火粒子特效组件
 * 模拟宗祠香烛升起的烟尘，微光点点，缓缓上升消散
 * 使用 react-native-reanimated 实现流畅动画
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';

// ─── 暖色调粒子配色 ─────────────────────────────────────────
const WARM_COLORS = [
  Colors.vermilion,   // 朱砂红
  Colors.amber,       // 琥珀黄
  '#D4713B',          // 橙铜色
  '#E8A87C',          // 浅珊瑚
  Colors.paper,       // 宣纸白（高光粒子）
];

const COOL_COLORS = [
  '#7BA3B0',          // 青瓷蓝
  '#9DBCB0',          // 薄荷青
  '#B8C9D0',          // 月白
  '#A0B8A8',          // 竹青
  Colors.paper,
];

// ─── 单个粒子组件 ───────────────────────────────────────────
interface ParticleProps {
  /** 启动延迟（毫秒） */
  delay: number;
  /** 粒子直径 */
  size: number;
  /** 水平起始位置（百分比对应的像素） */
  startX: number;
  /** 粒子颜色 */
  color: string;
  /** 一次上升循环时长（毫秒） */
  duration: number;
  /** 容器高度 */
  height: number;
  /** 摆动幅度 */
  swayAmount: number;
}

function Particle({
  delay,
  size,
  startX,
  color,
  duration,
  height,
  swayAmount,
}: ParticleProps) {
  const progress = useSharedValue(0);

  // 启动动画（仅初始化一次）
  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,   // 无限循环
        false, // 不反向
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // 垂直上升
    const translateY = interpolate(progress.value, [0, 1], [0, -height]);

    // 左右摆动（用 interpolate 模拟正弦曲线，worklet 内不能用 Math.sin）
    const translateX = interpolate(
      progress.value,
      [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
      [0, swayAmount * 0.7, swayAmount, swayAmount * 0.7, 0, -swayAmount * 0.7, -swayAmount, -swayAmount * 0.7, 0],
    );

    // 透明度：缓入，持续，渐出
    const opacity = interpolate(
      progress.value,
      [0, 0.1, 0.3, 0.7, 0.9, 1],
      [0, 0.6, 0.7, 0.4, 0.1, 0],
    );

    // 尺寸：越高越小（模拟远离）
    const scale = interpolate(progress.value, [0, 0.5, 1], [1, 0.7, 0.2]);

    return {
      transform: [{ translateY }, { translateX }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: startX,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

// ─── 主组件 ─────────────────────────────────────────────────

export interface IncenseParticlesProps {
  /** 粒子数量，默认 20 */
  count?: number;
  /** 容器高度，默认 300 */
  height?: number;
  /** 容器宽度，默认 '100%' */
  width?: number | string;
  /** 颜色方案：warm（暖色）| cool（冷色），默认 warm */
  scheme?: 'warm' | 'cool';
}

export function IncenseParticles({
  count = 20,
  height = 300,
  width = '100%',
  scheme = 'warm',
}: IncenseParticlesProps) {
  const colors = scheme === 'warm' ? WARM_COLORS : COOL_COLORS;

  // 预生成粒子参数（仅计算一次）
  const particles = useMemo(() => {
    // 百分比宽度时用屏幕实际宽度，数字则直接用
    const screenWidth = Dimensions.get('window').width;
    const containerWidth = typeof width === 'number' ? width : screenWidth;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: Math.random() * 3000,                       // 0-3秒错开启动
      size: 2 + Math.random() * 4,                       // 2-6px
      startX: Math.random() * (containerWidth - 10),     // 全宽随机
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 4000 + Math.random() * 4000,             // 4-8秒一个循环
      swayAmount: 8 + Math.random() * 12,                // 摆动幅度 8-20px
    }));
  }, [count, width, scheme]);

  return (
    <View
      style={[
        styles.container,
        {
          height,
          width: width as any,
        },
      ]}
    >
      {particles.map((p) => (
        <Particle
          key={p.id}
          delay={p.delay}
          size={p.size}
          startX={p.startX}
          color={p.color}
          duration={p.duration}
          height={height}
          swayAmount={p.swayAmount}
        />
      ))}
    </View>
  );
}

// ─── 样式 ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
