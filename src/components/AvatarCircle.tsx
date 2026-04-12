/**
 * 头像占位组件
 * 根据名字首字生成圆形头像，确定性柔和背景色
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** 柔和色板 — 中式暖色系 */
const PALETTE = [
  '#B33A2A', // 朱砂
  '#3F7A5E', // 翡翠
  '#C68A2E', // 琥珀
  '#5E574E', // 墨灰
  '#7B6B5A', // 土褐
  '#8B5E3C', // 栗棕
];

interface AvatarCircleProps {
  /** 长辈姓名，取首字显示 */
  name: string;
  /** 圆形直径，默认 60 */
  size?: number;
}

/**
 * 根据名字 charCode 确定性选色，居中显示首字
 */
export function AvatarCircle({ name, size = 60 }: AvatarCircleProps) {
  // 从名字生成确定性索引
  const charCode = name.charCodeAt(0) || 0;
  const bgColor = PALETTE[charCode % PALETTE.length];
  const initial = name.charAt(0) || '?';
  const fontSize = Math.round(size * 0.4);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
