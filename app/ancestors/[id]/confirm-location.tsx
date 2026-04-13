import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { MapPin, Camera, Mic, MicOff, ChevronDown, Navigation, PenLine } from 'lucide-react-native';

import { Colors } from '../../../src/constants/colors';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { useGravePin } from '../../../src/features/grave-pin/useGravePin';
import { navigateToLocation } from '../../../src/features/grave-pin/useNavigate';
import { useAncestorStore } from '../../../src/stores/ancestorStore';

type RecordingStatus = 'idle' | 'recording' | 'recorded';

/**
 * 墓地位置确认页
 *
 * 两种方式记录位置（二选一即可保存）：
 * 1. GPS 自动定位
 * 2. 手动输入地址
 */
export default function ConfirmLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { ancestors } = useAncestorStore();

  // --- 定位方式切换 ---
  const [mode, setMode] = useState<'gps' | 'manual'>('gps');

  // --- GPS 定位 ---
  const { status: locatingStatus, location, error: locatingError, startLocating } = useGravePin();

  // --- 手动地址 ---
  const [manualAddress, setManualAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  // --- 照片 ---
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // --- 语音备注 ---
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- 关联长辈 ---
  const [selectedAncestorId, setSelectedAncestorId] = useState<string | null>(id || null);

  // 判断是否可保存：有 GPS 定位 或 有手动地址 或 有补充描述
  const canSave = !!(location || manualAddress.trim() || addressDetail.trim());

  const handlePickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('需要麦克风权限'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setRecordingStatus('recording');
      setRecordingDuration(0);
      durationTimer.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch { Alert.alert('录音失败'); }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (durationTimer.current) { clearInterval(durationTimer.current); durationTimer.current = null; }
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (uri) { setAudioUri(uri); setRecordingStatus('recorded'); }
    } catch { setRecordingStatus('idle'); }
  }, []);

  const handleNavigate = useCallback(async () => {
    if (!location) return;
    await navigateToLocation({ latitude: location.latitude, longitude: location.longitude, name: '墓址位置' });
  }, [location]);

  const handleSave = useCallback(() => {
    const data = {
      ancestorId: selectedAncestorId,
      location,
      manualAddress: manualAddress.trim(),
      addressDetail: addressDetail.trim(),
      photoUri,
      audioUri,
      timestamp: new Date().toISOString(),
    };
    console.log('[ConfirmLocation] 保存:', JSON.stringify(data, null, 2));
    Alert.alert('已保存', '墓址位置已记录', [{ text: '好的', onPress: () => router.back() }]);
  }, [selectedAncestorId, location, manualAddress, addressDetail, photoUri, audioUri, router]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>

      {/* 定位方式切换 */}
      <View style={st.modeSwitch}>
        <Pressable
          style={[st.modeTab, mode === 'gps' && st.modeTabActive]}
          onPress={() => setMode('gps')}
        >
          <MapPin color={mode === 'gps' ? Colors.paper : Colors.inkLight} size={16} />
          <Text style={[st.modeTabText, mode === 'gps' && st.modeTabTextActive]}>GPS 定位</Text>
        </Pressable>
        <Pressable
          style={[st.modeTab, mode === 'manual' && st.modeTabActive]}
          onPress={() => setMode('manual')}
        >
          <PenLine color={mode === 'manual' ? Colors.paper : Colors.inkLight} size={16} />
          <Text style={[st.modeTabText, mode === 'manual' && st.modeTabTextActive]}>手动输入</Text>
        </Pressable>
      </View>

      {/* GPS 定位模式 */}
      {mode === 'gps' && (
        <View style={st.card}>
          <View style={st.cardHeader}>
            <MapPin color={Colors.vermilion} size={20} />
            <Text style={st.cardTitle}>{location ? '已定位' : '获取墓址位置'}</Text>
          </View>

          {location ? (
            <View style={st.locationInfo}>
              <Text style={st.coordText}>纬度：{location.latitude.toFixed(6)}</Text>
              <Text style={st.coordText}>经度：{location.longitude.toFixed(6)}</Text>
              {location.accuracy != null && <Text style={st.coordMute}>精度：±{location.accuracy.toFixed(1)} 米</Text>}
              <Pressable style={st.navBtn} onPress={handleNavigate}>
                <Navigation color={Colors.jade} size={16} />
                <Text style={st.navBtnText}>在地图中查看</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {locatingError && <Text style={st.errorText}>{locatingError}</Text>}
              <PrimaryButton
                title={locatingStatus === 'locating' ? '定位中…' : '开始定位'}
                onPress={startLocating}
                loading={locatingStatus === 'locating'}
                icon={<MapPin color={Colors.paper} size={18} />}
              />
            </View>
          )}

          {/* 补充地址描述 */}
          <TextInput
            style={[st.input, { marginTop: 12 }]}
            value={addressDetail}
            onChangeText={setAddressDetail}
            placeholder="补充描述（如：村口大柳树左边200米山坡上）"
            placeholderTextColor={Colors.inkMute}
            multiline
          />
        </View>
      )}

      {/* 手动输入模式 */}
      {mode === 'manual' && (
        <View style={st.card}>
          <View style={st.cardHeader}>
            <PenLine color={Colors.vermilion} size={20} />
            <Text style={st.cardTitle}>手动输入墓地地址</Text>
          </View>

          <TextInput
            style={st.input}
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="省/市/区/镇/村 + 具体位置"
            placeholderTextColor={Colors.inkMute}
            multiline
          />
          <Text style={st.hint}>例：山东省潍坊市寒亭区XX镇XX村北山坡</Text>

          <TextInput
            style={[st.input, { marginTop: 10 }]}
            value={addressDetail}
            onChangeText={setAddressDetail}
            placeholder="路线提示（如：进村后右转，过桥上山200米）"
            placeholderTextColor={Colors.inkMute}
            multiline
          />
        </View>
      )}

      {/* 照片 */}
      <View style={st.card}>
        <Pressable style={st.actionRow} onPress={handlePickPhoto}>
          <Camera color={Colors.inkLight} size={20} />
          <Text style={st.actionText}>{photoUri ? '已选择照片，点击更换' : '加照片（墓碑/环境）'}</Text>
        </Pressable>
        {photoUri && <Image source={{ uri: photoUri }} style={st.photo} resizeMode="cover" />}
      </View>

      {/* 语音备注 */}
      <View style={st.card}>
        {recordingStatus === 'idle' && (
          <Pressable style={st.actionRow} onPress={handleStartRecording}>
            <Mic color={Colors.inkLight} size={20} />
            <Text style={st.actionText}>加语音备注</Text>
          </Pressable>
        )}
        {recordingStatus === 'recording' && (
          <Pressable style={st.actionRow} onPress={handleStopRecording}>
            <MicOff color={Colors.crimson} size={20} />
            <Text style={[st.actionText, { color: Colors.crimson }]}>录音中 {formatDuration(recordingDuration)}… 点击停止</Text>
          </Pressable>
        )}
        {recordingStatus === 'recorded' && (
          <View style={st.actionRow}>
            <Mic color={Colors.jade} size={20} />
            <Text style={[st.actionText, { color: Colors.jade }]}>已录制 {formatDuration(recordingDuration)}</Text>
            <Pressable onPress={() => { setRecordingStatus('idle'); setAudioUri(null); setRecordingDuration(0); }}>
              <Text style={st.redoText}>重录</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 关联长辈 */}
      <View style={st.card}>
        <View style={st.cardHeader}>
          <ChevronDown color={Colors.inkLight} size={20} />
          <Text style={st.cardTitle}>关联到谁？（可跳过）</Text>
        </View>
        <View style={st.chipRow}>
          {ancestors.map(a => (
            <Pressable
              key={a.id}
              style={[st.chip, selectedAncestorId === a.id && st.chipActive]}
              onPress={() => setSelectedAncestorId(selectedAncestorId === a.id ? null : a.id)}
            >
              <Text style={[st.chipText, selectedAncestorId === a.id && st.chipTextActive]}>
                {a.relationship ? `${a.relationship}·${a.name}` : a.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 保存 — 始终可点击，保存时检查 */}
      <View style={st.saveArea}>
        <PrimaryButton title="保存" onPress={handleSave} />
      </View>

      {/* 提示：skill 在哪 */}
      <Pressable
        style={st.skillTip}
        onPress={() => router.push(`/ancestors/${id}/distill` as any)}
      >
        <Text style={st.skillTipText}>
          💡 想蒸馏长辈的数字人格？返回详情页 → 「蒸馏人格」
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: 20, paddingBottom: 40, gap: 14 },

  // 模式切换
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeTabActive: { backgroundColor: Colors.vermilion },
  modeTabText: { color: Colors.inkLight, fontSize: 14, fontWeight: '500' },
  modeTabTextActive: { color: Colors.paper, fontWeight: '600' },

  // 卡片
  card: { backgroundColor: Colors.paperDark, borderRadius: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.ink },

  // 输入
  input: { backgroundColor: Colors.paper, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.ink },
  hint: { color: Colors.inkMute, fontSize: 12, marginTop: 6, paddingLeft: 4 },

  // 定位信息
  locationInfo: { gap: 4 },
  coordText: { fontSize: 15, color: Colors.ink, fontVariant: ['tabular-nums'] },
  coordMute: { fontSize: 14, color: Colors.inkLight },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  navBtnText: { fontSize: 15, color: Colors.jade, fontWeight: '500' },
  errorText: { fontSize: 14, color: Colors.crimson, textAlign: 'center', marginBottom: 8 },

  // 操作行
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  actionText: { fontSize: 15, color: Colors.inkLight, flex: 1 },
  photo: { width: '100%', height: 180, borderRadius: 12, marginTop: 12 },
  redoText: { fontSize: 14, color: Colors.vermilion, fontWeight: '500' },

  // 关联长辈
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.paper, borderWidth: 1, borderColor: Colors.divider },
  chipActive: { backgroundColor: Colors.vermilion, borderColor: Colors.vermilion },
  chipText: { fontSize: 14, color: Colors.ink },
  chipTextActive: { color: Colors.paper, fontWeight: '500' },

  // 保存
  saveArea: { marginTop: 4 },
  saveHint: { color: Colors.inkMute, fontSize: 12, textAlign: 'center', marginTop: 8 },

  // skill 提示
  skillTip: {
    backgroundColor: Colors.amber + '15',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  skillTipText: { color: Colors.inkLight, fontSize: 13, textAlign: 'center' },
});
