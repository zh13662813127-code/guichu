/**
 * 通用页面容器
 * 解决 Web 端宽屏内容拉伸问题，统一页面间距
 * - maxWidth 680 居中（Web 端不会拉伸到全宽）
 * - 统一 paper 背景
 * - SafeAreaView
 */

import React from 'react';
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

interface PageContainerProps {
  children: React.ReactNode;
  /** 是否可滚动，默认 true */
  scrollable?: boolean;
  /** 是否去除内边距 */
  noPadding?: boolean;
  /** 自定义内层样式 */
  contentStyle?: ViewStyle;
}

/**
 * 页面容器 — 所有页面都应该被这个容器包裹
 * 外层 SafeAreaView 全屏 paper 背景
 * 内层 maxWidth: 680 居中，适配 Web 端
 */
export function PageContainer({
  children,
  scrollable = true,
  noPadding = false,
  contentStyle,
}: PageContainerProps) {
  const innerContent = (
    <View style={[styles.inner, noPadding && styles.noPadding, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {innerContent}
        </ScrollView>
      ) : (
        <View style={styles.flexContainer}>{innerContent}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  flexContainer: {
    flex: 1,
  },
  inner: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  noPadding: {
    paddingHorizontal: 0,
  },
});
