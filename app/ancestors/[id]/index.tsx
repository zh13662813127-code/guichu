/**
 * 长辈详情页 -- 占位
 * 后续实现完整的长辈资料展示
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../../../src/constants/colors';

export default function AncestorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>长辈详情</Text>
      <Text style={styles.hint}>详情页开发中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  hint: {
    color: Colors.inkMute,
    fontSize: 15,
  },
});
