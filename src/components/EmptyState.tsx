/**
 * 统一空状态组件
 * 居中布局，paperDark 背景圆角卡片
 * 支持可选诗句、图标、标题、副标题、操作按钮
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface EmptyStateProps {
  /** 顶部图标 */
  icon?: React.ReactNode;
  /** 主标题 */
  title: string;
  /** 副标题描述 */
  subtitle?: string;
  /** 操作按钮文字 */
  actionLabel?: string;
  /** 操作按钮回调 */
  onAction?: () => void;
  /** 可选的诗句/引言，显示在最上面 */
  quote?: string;
}

/**
 * 空状态卡片 — 用于无数据时的引导提示
 * 温暖克制的视觉风格，像古书中的留白注释
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  quote,
}: EmptyStateProps) {
  return (
    <View style={styles.card}>
      {/* 诗句引言 */}
      {quote ? (
        <Text style={styles.quote}>{quote}</Text>
      ) : null}

      {/* 图标 */}
      {icon ? (
        <View style={styles.iconWrap}>{icon}</View>
      ) : null}

      {/* 标题 */}
      <Text style={styles.title}>{title}</Text>

      {/* 副标题 */}
      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}

      {/* 操作按钮 */}
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onAction}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  quote: {
    color: Colors.inkLight,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  iconWrap: {
    marginBottom: 14,
  },
  title: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.inkMute,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: Colors.vermilion,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  actionButtonPressed: {
    backgroundColor: Colors.vermilionPressed,
  },
  actionText: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },
});
