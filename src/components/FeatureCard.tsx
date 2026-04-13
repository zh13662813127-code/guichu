/**
 * 可复用功能卡片组件
 * paperDark 背景，圆角 16，左侧图标 + 右侧标题/描述/操作按钮
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface FeatureCardProps {
  /** 左侧图标（ReactNode，如 lucide icon） */
  icon: React.ReactNode;
  /** 卡片标题 */
  title: string;
  /** 描述文字（可选） */
  description?: string;
  /** 操作按钮文字（可选） */
  actionLabel?: string;
  /** 操作按钮回调（可选） */
  onAction?: () => void;
  /** 状态：done 已完成 / pending 待处理 / disabled 不可用 */
  status?: 'done' | 'pending' | 'disabled';
  /** 自定义子内容，替代默认的 description + action 区域 */
  children?: React.ReactNode;
  /** 左侧彩色竖条颜色（可选） */
  accentColor?: string;
}

/**
 * 功能卡片 — 用于长辈详情页的各功能模块
 */
export function FeatureCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  status = 'pending',
  children,
  accentColor,
}: FeatureCardProps) {
  const isDisabled = status === 'disabled';

  return (
    <View style={[styles.card, isDisabled && styles.cardDisabled]}>
      {/* 左侧彩色竖条装饰 */}
      {accentColor && (
        <View
          style={[
            styles.accentBar,
            { backgroundColor: accentColor },
          ]}
        />
      )}
      <View style={styles.row}>
        {/* 左侧图标 */}
        <View style={styles.iconWrap}>{icon}</View>

        {/* 右侧内容 */}
        <View style={styles.content}>
          <Text style={[styles.title, isDisabled && styles.titleDisabled]}>
            {title}
          </Text>

          {children ? (
            children
          ) : (
            <>
              {description ? (
                <Text
                  style={[
                    styles.description,
                    isDisabled && styles.descriptionDisabled,
                  ]}
                >
                  {description}
                </Text>
              ) : null}

              {actionLabel && onAction ? (
                <Pressable
                  onPress={isDisabled ? undefined : onAction}
                  disabled={isDisabled}
                  style={({ pressed }) => [
                    styles.actionButton,
                    isDisabled && styles.actionButtonDisabled,
                    pressed && !isDisabled && styles.actionButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      isDisabled && styles.actionTextDisabled,
                    ]}
                  >
                    {actionLabel}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  // 左侧彩色竖条
  accentBar: {
    position: 'absolute' as const,
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 1.5,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  iconWrap: {
    paddingTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 4,
  },
  titleDisabled: {
    color: Colors.inkMute,
  },
  description: {
    fontSize: 14,
    color: Colors.inkLight,
    lineHeight: 20,
    marginBottom: 10,
  },
  descriptionDisabled: {
    color: Colors.inkMute,
  },
  actionButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vermilion,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonPressed: {
    backgroundColor: Colors.vermilionPressed,
  },
  actionButtonDisabled: {
    backgroundColor: Colors.inkMute,
  },
  actionText: {
    color: Colors.paper,
    fontSize: 14,
    fontWeight: '600',
  },
  actionTextDisabled: {
    color: Colors.paper,
  },
});
