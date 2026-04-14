/**
 * 首次启动欢迎叠加层
 * 冷启动时显示 "归处" 品牌动画 + 香火粒子背景
 * 2 秒后自动淡出消失
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { IncenseParticles } from './IncenseParticles';
import { Colors } from '../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function WelcomeOverlay() {
  const [visible, setVisible] = useState(true);

  // 动画值
  const overlayOpacity = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(12);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(8);

  useEffect(() => {
    // 标题淡入 + 上移
    titleOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    titleTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });

    // 副标题延迟 500ms 淡入
    subtitleOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
    subtitleTranslateY.value = withDelay(
      500,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );

    // 2.5 秒后整体淡出
    overlayOpacity.value = withDelay(
      2500,
      withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(setVisible)(false);
      }),
    );
  }, []);

  // 整体容器淡出
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // 标题动画
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  // 副标题动画
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {/* 背景粒子 — 底部区域 */}
      <View style={styles.particlesBottom}>
        <IncenseParticles count={25} height={SCREEN_HEIGHT * 0.6} />
      </View>

      {/* 中央品牌文字 */}
      <View style={styles.content}>
        <Animated.Text style={[styles.title, titleStyle]}>
          归 处
        </Animated.Text>

        <Animated.View style={[styles.subtitleWrap, subtitleStyle]}>
          <Text style={styles.subtitle}>在你还来得及的时候</Text>
          <Text style={styles.subtitle}>把他们留下来</Text>
        </Animated.View>
      </View>

      {/* 底部装饰线 */}
      <View style={styles.bottomDecor}>
        <View style={styles.decorLine} />
      </View>
    </Animated.View>
  );
}

// ─── 样式 ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.paper,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 粒子背景层
  particlesBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  // 中央内容
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 12,
  },
  subtitleWrap: {
    alignItems: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.inkLight,
    lineHeight: 26,
    letterSpacing: 1,
  },

  // 底部装饰
  bottomDecor: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  decorLine: {
    width: 32,
    height: 2,
    backgroundColor: Colors.vermilion,
    borderRadius: 1,
    opacity: 0.5,
  },
});
