import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { MapPin, Camera, Mic, MicOff, ChevronDown, Navigation } from 'lucide-react-native';

import { Colors } from '../../../src/constants/colors';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { useGravePin } from '../../../src/features/grave-pin/useGravePin';
import { navigateToLocation } from '../../../src/features/grave-pin/useNavigate';

/** 录音状态 */
type RecordingStatus = 'idle' | 'recording' | 'recorded';

/**
 * 定位确认页（Modal 风格）
 *
 * 功能：
 * 1. GPS 定位并显示坐标
 * 2. 拍照/选择照片附件
 * 3. 语音备注录制
 * 4. 关联长辈（下拉选择，可跳过）
 * 5. 保存（暂不连接数据库）
 */
export default function ConfirmLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // --- GPS 定位 ---
  const {
    status: locatingStatus,
    location,
    error: locatingError,
    startLocating,
    reset: resetLocation,
  } = useGravePin();

  // --- 照片附件 ---
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // --- 语音备注 ---
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- 关联长辈 ---
  const [selectedAncestor, setSelectedAncestor] = useState<string | null>(null);

  // 模拟的长辈列表（后续从数据库获取）
  const mockAncestors = [
    { id: '1', name: '外公' },
    { id: '2', name: '外婆' },
    { id: '3', name: '爷爷' },
    { id: '4', name: '奶奶' },
  ];

  /** 选择或拍照 */
  const handlePickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  /** 开始录音 */
  const handleStartRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要麦克风权限', '请在系统设置中开启麦克风权限');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setRecordingStatus('recording');
      setRecordingDuration(0);

      // 计时器
      durationTimer.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      Alert.alert('录音失败', '请检查麦克风权限后重试');
    }
  }, []);

  /** 停止录音 */
  const handleStopRecording = useCallback(async () => {
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }

    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (uri) {
        setAudioUri(uri);
        setRecordingStatus('recorded');
      }
    } catch {
      setRecordingStatus('idle');
    }
  }, []);

  /** 打开导航 */
  const handleNavigate = useCallback(async () => {
    if (!location) return;
    await navigateToLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      name: '墓址位置',
    });
  }, [location]);

  /** 保存（暂不连接数据库） */
  const handleSave = useCallback(() => {
    const data = {
      ancestorId: id,
      location,
      photoUri,
      audioUri,
      selectedAncestor,
      timestamp: new Date().toISOString(),
    };

    console.log('[ConfirmLocation] 保存数据（待接入数据库）：', JSON.stringify(data, null, 2));
    Alert.alert('已记录', '墓址位置已暂存，稍后将同步到本地数据库', [
      { text: '好的', onPress: () => router.back() },
    ]);
  }, [id, location, photoUri, audioUri, selectedAncestor, router]);

  /** 格式化录音时长 */
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* 定位卡片 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MapPin color={Colors.vermilion} size={20} />
          <Text style={styles.cardTitle}>
            {location ? '已记录位置' : '获取墓址位置'}
          </Text>
        </View>

        {location ? (
          <View style={styles.locationInfo}>
            <Text style={styles.coordText}>
              纬度：{location.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordText}>
              经度：{location.longitude.toFixed(6)}
            </Text>
            {location.accuracy != null && (
              <Text style={styles.coordTextMute}>
                精度：±{location.accuracy.toFixed(1)} 米
              </Text>
            )}
            {location.altitude != null && (
              <Text style={styles.coordTextMute}>
                海拔：{location.altitude.toFixed(1)} 米
              </Text>
            )}

            <Pressable style={styles.navButton} onPress={handleNavigate}>
              <Navigation color={Colors.jade} size={16} />
              <Text style={styles.navButtonText}>在地图中查看</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.locatingArea}>
            {locatingStatus === 'error' && (
              <Text style={styles.errorText}>{locatingError}</Text>
            )}
            <PrimaryButton
              title={locatingStatus === 'locating' ? '定位中…' : '开始定位'}
              onPress={startLocating}
              loading={locatingStatus === 'locating'}
              icon={<MapPin color={Colors.paper} size={18} />}
            />
          </View>
        )}
      </View>

      {/* 照片附件 */}
      <View style={styles.card}>
        <Pressable style={styles.actionRow} onPress={handlePickPhoto}>
          <Camera color={Colors.inkLight} size={20} />
          <Text style={styles.actionText}>
            {photoUri ? '已选择照片，点击更换' : '加照片'}
          </Text>
        </Pressable>

        {photoUri && (
          <Image
            source={{ uri: photoUri }}
            style={styles.photoPreview}
            resizeMode="cover"
          />
        )}
      </View>

      {/* 语音备注 */}
      <View style={styles.card}>
        {recordingStatus === 'idle' && (
          <Pressable style={styles.actionRow} onPress={handleStartRecording}>
            <Mic color={Colors.inkLight} size={20} />
            <Text style={styles.actionText}>加语音备注</Text>
          </Pressable>
        )}

        {recordingStatus === 'recording' && (
          <Pressable style={styles.actionRow} onPress={handleStopRecording}>
            <MicOff color={Colors.crimson} size={20} />
            <Text style={[styles.actionText, { color: Colors.crimson }]}>
              录音中 {formatDuration(recordingDuration)}… 点击停止
            </Text>
          </Pressable>
        )}

        {recordingStatus === 'recorded' && (
          <View style={styles.actionRow}>
            <Mic color={Colors.jade} size={20} />
            <Text style={[styles.actionText, { color: Colors.jade }]}>
              已录制 {formatDuration(recordingDuration)}
            </Text>
            <Pressable
              onPress={() => {
                setRecordingStatus('idle');
                setAudioUri(null);
                setRecordingDuration(0);
              }}
            >
              <Text style={styles.redoText}>重录</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 关联长辈 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ChevronDown color={Colors.inkLight} size={20} />
          <Text style={styles.cardTitle}>关联到谁？（可跳过）</Text>
        </View>

        <View style={styles.ancestorList}>
          {mockAncestors.map((ancestor) => (
            <Pressable
              key={ancestor.id}
              style={[
                styles.ancestorChip,
                selectedAncestor === ancestor.id && styles.ancestorChipSelected,
              ]}
              onPress={() =>
                setSelectedAncestor(
                  selectedAncestor === ancestor.id ? null : ancestor.id
                )
              }
            >
              <Text
                style={[
                  styles.ancestorChipText,
                  selectedAncestor === ancestor.id &&
                    styles.ancestorChipTextSelected,
                ]}
              >
                {ancestor.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 保存按钮 */}
      <View style={styles.saveArea}>
        <PrimaryButton
          title="保存"
          onPress={handleSave}
          disabled={!location}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
  },
  locationInfo: {
    gap: 4,
  },
  coordText: {
    fontSize: 15,
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
  },
  coordTextMute: {
    fontSize: 14,
    color: Colors.inkLight,
    fontVariant: ['tabular-nums'],
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  navButtonText: {
    fontSize: 15,
    color: Colors.jade,
    fontWeight: '500',
  },
  locatingArea: {
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.crimson,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 15,
    color: Colors.inkLight,
    flex: 1,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 12,
  },
  redoText: {
    fontSize: 14,
    color: Colors.vermilion,
    fontWeight: '500',
  },
  ancestorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ancestorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  ancestorChipSelected: {
    backgroundColor: Colors.vermilion,
    borderColor: Colors.vermilion,
  },
  ancestorChipText: {
    fontSize: 14,
    color: Colors.ink,
  },
  ancestorChipTextSelected: {
    color: Colors.paper,
    fontWeight: '500',
  },
  saveArea: {
    marginTop: 8,
  },
});
