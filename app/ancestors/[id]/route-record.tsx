/**
 * 路线记录页 — 户外轨迹记录风格
 * 参考咕咚的运动记录页面设计
 *
 * 功能：
 * - 顶部红色录制指示器（闪烁红点 + REC）
 * - 实时统计：已记录点数 + 累计距离
 * - 已记录的点以紧凑时间轴列表显示
 * - 底部居中超大圆形记录按钮
 * - 点击记录按钮弹出半屏面板（拍照 + 备注 + GPS 自动获取）
 *
 * MVP 阶段：录制的路线点存在组件 state，结束时 Alert 提示
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { TrackStats } from '../../../src/components/TrackStats';

/* ------------------------------------------------------------------ */
/*  数据结构                                                           */
/* ------------------------------------------------------------------ */

/** 路线点结构 */
interface RecordPoint {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  note: string;
  imagePath: string | null;
  timestamp: number;
  /** 距离上一个点（米），第一个点为 0 */
  distFromPrev: number;
}

/* ------------------------------------------------------------------ */
/*  工具函数                                                           */
/* ------------------------------------------------------------------ */

/** 模拟获取 GPS 坐标 */
function getMockGPS(): { latitude: number; longitude: number } {
  return {
    latitude: 30.274 + Math.random() * 0.01,
    longitude: 120.155 + Math.random() * 0.01,
  };
}

/** 简单距离估算（两点间直线距离，米） */
function estimateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  // 简化计算：1度纬度 ≈ 111km，1度经度 ≈ 111km * cos(lat)
  const dLat = (lat2 - lat1) * 111000;
  const dLng = (lng2 - lng1) * 111000 * Math.cos((lat1 * Math.PI) / 180);
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
}

/** 格式化时间差（如 "刚刚"、"2分钟前"） */
function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 30) return '刚记录';
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  return `${Math.floor(diff / 3600)}小时前`;
}

/* ------------------------------------------------------------------ */
/*  闪烁红点组件                                                       */
/* ------------------------------------------------------------------ */

function BlinkingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[recStyles.dot, { opacity }]} />
  );
}

/* ------------------------------------------------------------------ */
/*  主页面                                                             */
/* ------------------------------------------------------------------ */

export default function RouteRecordScreen() {
  const router = useRouter();
  const [points, setPoints] = useState<RecordPoint[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentGPS, setCurrentGPS] = useState({ latitude: 0, longitude: 0 });
  const [noteInput, setNoteInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);

  // 每隔 30 秒刷新一次，让 "X分钟前" 更新
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  /** 累计总距离 */
  const totalDistance = useMemo(
    () => points.reduce((sum, p) => sum + p.distFromPrev, 0),
    [points],
  );

  /** 预计步行时间（80m/min） */
  const estimatedMinutes = useMemo(() => totalDistance / 80, [totalDistance]);

  /** 点击「记录路线点」→ 获取 GPS 并弹出弹窗 */
  const handleRecordPoint = useCallback(() => {
    const gps = getMockGPS();
    setCurrentGPS(gps);
    setNoteInput('');
    setLabelInput('');
    setCurrentImagePath(null);
    setShowModal(true);
  }, []);

  /** 拍照 */
  const handleTakePhoto = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('提示', '拍照功能在 Web 端不可用，请在手机上使用');
      return;
    }
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        setCurrentImagePath(result.assets[0].uri);
      }
    } catch {
      Alert.alert('提示', '拍照功能暂不可用');
    }
  }, []);

  /** 保存当前路线点 */
  const handleSavePoint = useCallback(() => {
    // 计算距离上一个点
    let dist = 0;
    if (points.length > 0) {
      const prev = points[points.length - 1];
      dist = estimateDistance(
        prev.latitude,
        prev.longitude,
        currentGPS.latitude,
        currentGPS.longitude,
      );
    }

    const newPoint: RecordPoint = {
      id: `rp_${Date.now()}`,
      label: labelInput.trim() || `路线点 ${points.length + 1}`,
      latitude: currentGPS.latitude,
      longitude: currentGPS.longitude,
      note: noteInput.trim(),
      imagePath: currentImagePath,
      timestamp: Date.now(),
      distFromPrev: dist,
    };
    setPoints((prev) => [...prev, newPoint]);
    setShowModal(false);
  }, [currentGPS, noteInput, labelInput, currentImagePath, points]);

  /** 结束路线 */
  const handleFinish = useCallback(() => {
    if (points.length === 0) {
      Alert.alert('提示', '还没有记录任何路线点');
      return;
    }
    Alert.alert(
      '路线记录完成',
      `已记录 ${points.length} 个路线点，总距离约 ${totalDistance}m\n（MVP 阶段数据存在内存中）`,
      [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ],
    );
  }, [points, totalDistance, router]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* ===== 顶部录制指示器 ===== */}
      <View style={recStyles.statusBar}>
        <View style={recStyles.statusLeft}>
          <BlinkingDot />
          <Text style={recStyles.recLabel}>REC</Text>
          <Text style={recStyles.statusText}>正在记录路线</Text>
        </View>
      </View>

      {/* ===== 实时统计 ===== */}
      <View style={recStyles.statsRow}>
        <TrackStats
          totalDistance={totalDistance}
          waypointCount={points.length}
          estimatedMinutes={estimatedMinutes}
        />
      </View>

      {/* ===== 已记录的路线点列表 ===== */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {points.length === 0 ? (
          <View style={styles.emptyHintBox}>
            <Text style={styles.emptyHintIcon}>🥾</Text>
            <Text style={styles.emptyHintText}>
              点击下方按钮开始记录路线点
            </Text>
          </View>
        ) : (
          <>
            <Text style={recStyles.listTitle}>已记录的路线点</Text>
            {points.map((p, idx) => (
              <View key={p.id} style={recStyles.listItem}>
                {/* 序号 */}
                <View style={recStyles.listBadge}>
                  <Text style={recStyles.listBadgeText}>{idx + 1}</Text>
                </View>
                {/* 信息 */}
                <View style={recStyles.listInfo}>
                  <Text style={recStyles.listLabel}>{p.label}</Text>
                  <View style={recStyles.listMeta}>
                    {p.distFromPrev > 0 && (
                      <Text style={recStyles.listDist}>
                        {p.distFromPrev}m
                      </Text>
                    )}
                    <Text style={recStyles.listTime}>
                      {formatTimeAgo(p.timestamp)}
                    </Text>
                  </View>
                </View>
                {/* 备注预览 */}
                {p.note ? (
                  <Text style={recStyles.listNote} numberOfLines={1}>
                    📝{p.note}
                  </Text>
                ) : null}
                {p.imagePath ? (
                  <Text style={recStyles.listPhoto}>📷</Text>
                ) : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ===== 底部：大圆记录按钮 + 结束文字 ===== */}
      <View style={recStyles.bottomArea}>
        <Pressable
          onPress={handleRecordPoint}
          style={({ pressed }) => [
            recStyles.bigRecordBtn,
            pressed && recStyles.bigRecordBtnPressed,
          ]}
        >
          <Text style={recStyles.bigRecordIcon}>📌</Text>
          <Text style={recStyles.bigRecordText}>记录路线点</Text>
        </Pressable>

        <Pressable onPress={handleFinish} style={recStyles.finishBtn}>
          <Text style={recStyles.finishBtnText}>结束记录</Text>
        </Pressable>
      </View>

      {/* ===== 半屏弹窗：记录路线点 ===== */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            {/* 拖拽手柄 */}
            <View style={modalStyles.handle} />

            <Text style={modalStyles.title}>记录路线点</Text>

            {/* GPS 坐标 */}
            <View style={modalStyles.gpsRow}>
              <Text style={modalStyles.gpsLabel}>GPS 坐标</Text>
              <Text style={modalStyles.gpsValue}>
                {currentGPS.latitude.toFixed(6)},{' '}
                {currentGPS.longitude.toFixed(6)}
              </Text>
            </View>

            {/* 标签名 */}
            <Text style={modalStyles.inputLabel}>位置名称</Text>
            <TextInput
              style={modalStyles.input}
              value={labelInput}
              onChangeText={(t) => setLabelInput(t.slice(0, 20))}
              placeholder={`路线点 ${points.length + 1}`}
              placeholderTextColor={Colors.inkMute}
              maxLength={20}
            />

            {/* 拍照按钮 */}
            <Pressable style={modalStyles.photoBtn} onPress={handleTakePhoto}>
              <Text style={modalStyles.photoBtnText}>
                {currentImagePath ? '📷 重新拍照' : '📷 拍照记录'}
              </Text>
            </Pressable>
            {currentImagePath && (
              <Text style={modalStyles.photoHint}>已选择图片</Text>
            )}

            {/* 文字备注 */}
            <Text style={modalStyles.inputLabel}>文字备注（50字以内）</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.noteInput]}
              value={noteInput}
              onChangeText={(t) => setNoteInput(t.slice(0, 50))}
              placeholder="例如：看到大柳树右转"
              placeholderTextColor={Colors.inkMute}
              multiline
              maxLength={50}
            />
            <Text style={modalStyles.charCount}>{noteInput.length}/50</Text>

            {/* 保存按钮 */}
            <Pressable
              onPress={handleSavePoint}
              style={modalStyles.saveBtn}
            >
              <Text style={modalStyles.saveBtnText}>保存这个点</Text>
            </Pressable>

            {/* 取消 */}
            <Pressable
              style={modalStyles.cancelBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={modalStyles.cancelBtnText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  基础样式                                                           */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 240,
  },
  emptyHintBox: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyHintIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyHintText: {
    color: Colors.inkMute,
    fontSize: 15,
  },
});

/* ------------------------------------------------------------------ */
/*  录制指示器 + 列表样式                                               */
/* ------------------------------------------------------------------ */

const recStyles = StyleSheet.create({
  /* 顶部录制状态栏 */
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.crimson,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4444',
    marginRight: 6,
  },
  recLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    marginRight: 10,
  },
  statusText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },

  /* 统计区 */
  statsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* 已记录列表 */
  listTitle: {
    color: Colors.inkLight,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paperDark,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  listBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  listBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  listInfo: {
    flex: 1,
  },
  listLabel: {
    color: Colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  listMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  listDist: {
    color: Colors.vermilion,
    fontSize: 12,
    fontWeight: '500',
  },
  listTime: {
    color: Colors.inkMute,
    fontSize: 12,
  },
  listNote: {
    color: Colors.inkMute,
    fontSize: 12,
    maxWidth: 80,
    marginLeft: 4,
  },
  listPhoto: {
    fontSize: 16,
    marginLeft: 6,
  },

  /* 底部区域 */
  bottomArea: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  bigRecordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
    // 阴影
    shadowColor: Colors.vermilion,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bigRecordBtnPressed: {
    backgroundColor: Colors.vermilionPressed,
    transform: [{ scale: 0.95 }],
  },
  bigRecordIcon: {
    fontSize: 24,
  },
  bigRecordText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  finishBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  finishBtnText: {
    color: Colors.inkMute,
    fontSize: 14,
    fontWeight: '500',
  },
});

/* ------------------------------------------------------------------ */
/*  半屏弹窗样式                                                       */
/* ------------------------------------------------------------------ */

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },

  /* GPS 行 */
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.paperDark,
    borderRadius: 8,
  },
  gpsLabel: {
    color: Colors.inkLight,
    fontSize: 14,
  },
  gpsValue: {
    color: Colors.ink,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  /* 输入框 */
  inputLabel: {
    color: Colors.inkLight,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Colors.ink,
    fontSize: 15,
    backgroundColor: Colors.paperDark,
  },
  noteInput: {
    minHeight: 60,
    height: undefined,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    color: Colors.inkMute,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },

  /* 拍照按钮 */
  photoBtn: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  photoBtnText: {
    color: Colors.jade,
    fontSize: 15,
    fontWeight: '500',
  },
  photoHint: {
    color: Colors.jade,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },

  /* 保存按钮 */
  saveBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  /* 取消按钮 */
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
    padding: 8,
  },
  cancelBtnText: {
    color: Colors.inkMute,
    fontSize: 15,
  },
});
