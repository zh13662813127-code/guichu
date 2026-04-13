/**
 * 轨迹统计卡片组件
 * 参考户外 App（咕咚/两步路）的数据仪表盘风格
 * 三列布局：总距离 / 路线点数 / 预计步行时间
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface TrackStatsProps {
  /** 总距离（米） */
  totalDistance: number;
  /** 路线点数量 */
  waypointCount: number;
  /** 预计步行时间（分钟） */
  estimatedMinutes: number;
}

/** 格式化距离显示 */
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

/** 格式化时间显示 */
function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }
  return `${Math.round(minutes)}min`;
}

export function TrackStats({
  totalDistance,
  waypointCount,
  estimatedMinutes,
}: TrackStatsProps) {
  return (
    <View style={styles.card}>
      {/* 总距离 */}
      <View style={styles.column}>
        <Text style={styles.value}>{formatDistance(totalDistance)}</Text>
        <Text style={styles.label}>总距离</Text>
      </View>

      <View style={styles.separator} />

      {/* 路线点数 */}
      <View style={styles.column}>
        <Text style={styles.value}>{waypointCount}</Text>
        <Text style={styles.label}>路线点</Text>
      </View>

      <View style={styles.separator} />

      {/* 预计步行时间 */}
      <View style={styles.column}>
        <Text style={styles.value}>{formatTime(estimatedMinutes)}</Text>
        <Text style={styles.label}>预计步行</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 32,
    backgroundColor: Colors.divider,
  },
  value: {
    color: Colors.vermilion,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    color: Colors.inkMute,
    fontSize: 12,
  },
});
