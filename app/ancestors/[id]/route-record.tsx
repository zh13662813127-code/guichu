/**
 * 路线记录页
 * 全屏记录模式，逐步记录路线点
 * MVP 阶段：录制的路线点存在组件 state，结束时 Alert 提示
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { PrimaryButton } from '../../../src/components/PrimaryButton';

/** 路线点结构 */
interface RecordPoint {
  id: string;
  latitude: number;
  longitude: number;
  note: string;
  imagePath: string | null;
  timestamp: string;
}

/** 模拟获取 GPS 坐标 */
function getMockGPS(): { latitude: number; longitude: number } {
  // MVP：返回模拟坐标 + 随机偏移
  return {
    latitude: 30.274 + Math.random() * 0.01,
    longitude: 120.155 + Math.random() * 0.01,
  };
}

export default function RouteRecordScreen() {
  const router = useRouter();
  const [points, setPoints] = useState<RecordPoint[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentGPS, setCurrentGPS] = useState({ latitude: 0, longitude: 0 });
  const [noteInput, setNoteInput] = useState('');
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);

  /** 点击「记录路线点」→ 获取 GPS 并弹出弹窗 */
  const handleRecordPoint = useCallback(() => {
    const gps = getMockGPS();
    setCurrentGPS(gps);
    setNoteInput('');
    setCurrentImagePath(null);
    setShowModal(true);
  }, []);

  /** 拍照（MVP：提示功能暂未实现） */
  const handleTakePhoto = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('提示', '拍照功能在 Web 端不可用，请在手机上使用');
      return;
    }
    try {
      // 动态导入 expo-image-picker，避免 Web 端报错
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
    const newPoint: RecordPoint = {
      id: `rp_${Date.now()}`,
      latitude: currentGPS.latitude,
      longitude: currentGPS.longitude,
      note: noteInput.trim(),
      imagePath: currentImagePath,
      timestamp: new Date().toISOString(),
    };
    setPoints((prev) => [...prev, newPoint]);
    setShowModal(false);
  }, [currentGPS, noteInput, currentImagePath]);

  /** 结束路线 */
  const handleFinish = useCallback(() => {
    if (points.length === 0) {
      Alert.alert('提示', '还没有记录任何路线点');
      return;
    }
    Alert.alert(
      '路线记录完成',
      `已记录 ${points.length} 个路线点\n（MVP 阶段数据存在内存中，实际存储等原生端实现）`,
      [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]
    );
  }, [points, router]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 顶部状态栏 */}
      <View style={styles.statusBar}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>
          正在记录路线 · 已记录 {points.length} 个点
        </Text>
      </View>

      {/* 已记录点列表 */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {points.length === 0 ? (
          <View style={styles.emptyHintBox}>
            <Text style={styles.emptyHintText}>
              点击下方按钮开始记录路线点
            </Text>
          </View>
        ) : (
          points.map((p, idx) => (
            <View key={p.id} style={styles.pointCard}>
              <View style={styles.pointIndex}>
                <Text style={styles.pointIndexText}>{idx + 1}</Text>
              </View>
              <View style={styles.pointInfo}>
                <Text style={styles.pointCoord}>
                  {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                </Text>
                {p.note ? (
                  <Text style={styles.pointNote}>{p.note}</Text>
                ) : null}
                {p.imagePath ? (
                  <Text style={styles.pointPhoto}>📷 已拍照</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 底部按钮区 */}
      <View style={styles.bottomArea}>
        <PrimaryButton
          title="📌 记录路线点"
          onPress={handleRecordPoint}
        />
        <Pressable style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>结束路线</Text>
        </Pressable>
      </View>

      {/* 半屏弹窗：记录路线点 */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* 拖拽手柄 */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>记录路线点</Text>

            {/* GPS 坐标 */}
            <View style={styles.gpsRow}>
              <Text style={styles.gpsLabel}>GPS 坐标</Text>
              <Text style={styles.gpsValue}>
                {currentGPS.latitude.toFixed(6)},{' '}
                {currentGPS.longitude.toFixed(6)}
              </Text>
            </View>

            {/* 拍照按钮 */}
            <Pressable style={styles.photoBtn} onPress={handleTakePhoto}>
              <Text style={styles.photoBtnText}>
                {currentImagePath ? '📷 重新拍照' : '📷 拍照'}
              </Text>
            </Pressable>
            {currentImagePath && (
              <Text style={styles.photoHint}>已选择图片</Text>
            )}

            {/* 文字备注 */}
            <Text style={styles.inputLabel}>文字备注（50字以内）</Text>
            <TextInput
              style={styles.noteInput}
              value={noteInput}
              onChangeText={(t) => setNoteInput(t.slice(0, 50))}
              placeholder="例如：看到大柳树右转"
              placeholderTextColor={Colors.inkMute}
              multiline
              maxLength={50}
            />
            <Text style={styles.charCount}>{noteInput.length}/50</Text>

            {/* 保存按钮 */}
            <PrimaryButton
              title="保存这个点"
              onPress={handleSavePoint}
              style={{ marginTop: 16 }}
            />

            {/* 取消 */}
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelBtnText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },

  // 顶部状态栏
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.crimson,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4444',
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },

  // 列表
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 200,
  },

  // 空提示
  emptyHintBox: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyHintText: {
    color: Colors.inkMute,
    fontSize: 15,
  },

  // 已记录点卡片
  pointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.paperDark,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  pointIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pointIndexText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pointInfo: {
    flex: 1,
  },
  pointCoord: {
    color: Colors.ink,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pointNote: {
    color: Colors.inkLight,
    fontSize: 14,
    marginTop: 4,
  },
  pointPhoto: {
    color: Colors.jade,
    fontSize: 13,
    marginTop: 2,
  },

  // 底部按钮区
  bottomArea: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 10,
  },
  finishBtn: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    color: Colors.crimson,
    fontSize: 15,
    fontWeight: '600',
  },

  // 弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },

  // GPS 行
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

  // 拍照按钮
  photoBtn: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.jade,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    marginBottom: 12,
  },

  // 备注输入
  inputLabel: {
    color: Colors.inkLight,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 6,
  },
  noteInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 10,
    padding: 12,
    color: Colors.ink,
    fontSize: 15,
    backgroundColor: Colors.paperDark,
    textAlignVertical: 'top',
  },
  charCount: {
    color: Colors.inkMute,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },

  // 取消按钮
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
