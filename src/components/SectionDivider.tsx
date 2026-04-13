/**
 * 装饰性分隔线 — 线装书风格
 * 左右各一条细线 + 中间一个小菱形装饰
 * 用于首页各区域之间
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface SectionDividerProps {
  /** 中间装饰类型，默认 diamond */
  ornament?: 'diamond' | 'dot' | 'double-dot';
  /** 自定义颜色，默认 divider */
  color?: string;
  /** 上下外边距，默认 24 */
  spacing?: number;
}

/**
 * 线装书风格分隔线
 * 中间菱形/圆点装饰，两侧细线延伸
 */
export function SectionDivider({
  ornament = 'diamond',
  color = Colors.divider,
  spacing = 24,
}: SectionDividerProps) {
  // 渲染中间装饰
  const renderOrnament = () => {
    switch (ornament) {
      case 'dot':
        return (
          <View style={[styles.dot, { backgroundColor: color }]} />
        );
      case 'double-dot':
        return (
          <View style={styles.doubleDotRow}>
            <View style={[styles.smallDot, { backgroundColor: color }]} />
            <View style={[styles.smallDot, { backgroundColor: color, marginLeft: 6 }]} />
          </View>
        );
      case 'diamond':
      default:
        return (
          <View style={[styles.diamond, { borderColor: color }]} />
        );
    }
  };

  return (
    <View style={[styles.container, { marginVertical: spacing }]}>
      <View style={[styles.line, { backgroundColor: color }]} />
      <View style={styles.ornamentWrap}>
        {renderOrnament()}
      </View>
      <View style={[styles.line, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  ornamentWrap: {
    paddingHorizontal: 12,
  },
  // 菱形装饰：旋转 45 度的小方块
  diamond: {
    width: 7,
    height: 7,
    borderWidth: 1.2,
    borderColor: Colors.divider,
    transform: [{ rotate: '45deg' }],
  },
  // 单圆点
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  // 双圆点
  doubleDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
  },
});
