/**
 * 新建长辈页 -- 最简表单
 * 姓名、关系、性别、出生年、去世日期
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useAncestorStore } from '../../src/stores/ancestorStore';
import { PrimaryButton } from '../../src/components/PrimaryButton';

/** 关系选项 */
const RELATIONSHIP_OPTIONS = [
  '爷爷', '奶奶', '外公', '外婆', '父亲', '母亲', '其他',
] as const;

/** 性别选项 */
const GENDER_OPTIONS = [
  { label: '男', value: 'male' as const },
  { label: '女', value: 'female' as const },
];

export default function NewAncestorScreen() {
  const router = useRouter();
  const { addAncestor } = useAncestorStore();

  // 表单状态
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [birthYear, setBirthYear] = useState('');
  const [deathDate, setDeathDate] = useState(''); // yyyy-MM-dd 格式
  const [isSaving, setIsSaving] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);

  /** 保存长辈 */
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入姓名');
      return;
    }

    setIsSaving(true);
    try {
      // 解析去世年份
      let deathYear: number | undefined;
      let deathDateStr: string | undefined;
      if (deathDate.trim()) {
        deathDateStr = deathDate.trim();
        const parts = deathDateStr.split('-');
        if (parts.length >= 1) {
          deathYear = parseInt(parts[0], 10);
        }
      }

      await addAncestor({
        name: name.trim(),
        relationship: relationship || undefined,
        gender: gender || undefined,
        birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
        deathYear,
        deathDate: deathDateStr,
      });

      router.back();
    } catch (e) {
      console.error('保存失败:', e);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [name, relationship, gender, birthYear, deathDate, addAncestor, router]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 姓名 */}
        <View style={styles.field}>
          <Text style={styles.label}>姓名 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="请输入长辈姓名"
            placeholderTextColor={Colors.inkMute}
            autoFocus
          />
        </View>

        {/* 与我的关系 */}
        <View style={styles.field}>
          <Text style={styles.label}>与我的关系</Text>
          <Pressable
            style={styles.input}
            onPress={() => setShowRelPicker(!showRelPicker)}
          >
            <Text style={relationship ? styles.inputText : styles.placeholder}>
              {relationship || '请选择关系'}
            </Text>
          </Pressable>
          {showRelPicker && (
            <View style={styles.optionsRow}>
              {RELATIONSHIP_OPTIONS.map((rel) => (
                <Pressable
                  key={rel}
                  style={[
                    styles.optionChip,
                    relationship === rel && styles.optionChipActive,
                  ]}
                  onPress={() => {
                    setRelationship(rel);
                    setShowRelPicker(false);
                    // 自动设置性别
                    if (['爷爷', '外公', '父亲'].includes(rel)) setGender('male');
                    if (['奶奶', '外婆', '母亲'].includes(rel)) setGender('female');
                  }}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      relationship === rel && styles.optionChipTextActive,
                    ]}
                  >
                    {rel}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* 性别 */}
        <View style={styles.field}>
          <Text style={styles.label}>性别</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.genderButton,
                  gender === opt.value && styles.genderButtonActive,
                ]}
                onPress={() => setGender(opt.value)}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === opt.value && styles.genderButtonTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 出生年 */}
        <View style={styles.field}>
          <Text style={styles.label}>出生年份</Text>
          <TextInput
            style={styles.input}
            value={birthYear}
            onChangeText={setBirthYear}
            placeholder="如 1945"
            placeholderTextColor={Colors.inkMute}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        {/* 去世日期 */}
        <View style={styles.field}>
          <Text style={styles.label}>去世日期</Text>
          <TextInput
            style={styles.input}
            value={deathDate}
            onChangeText={setDeathDate}
            placeholder="如 2024-03-15（健在则留空）"
            placeholderTextColor={Colors.inkMute}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            maxLength={10}
          />
          <Text style={styles.hint}>
            填写后将自动生成习俗提醒日历
          </Text>
        </View>
      </ScrollView>

      {/* 保存按钮 */}
      <View style={styles.footer}>
        <PrimaryButton
          title="保存"
          onPress={handleSave}
          loading={isSaving}
          disabled={!name.trim()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.ink,
  },
  inputText: {
    color: Colors.ink,
    fontSize: 16,
  },
  placeholder: {
    color: Colors.inkMute,
    fontSize: 16,
  },
  hint: {
    color: Colors.inkMute,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
  },
  // 关系选择器
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  optionChip: {
    backgroundColor: Colors.paperDark,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  optionChipActive: {
    backgroundColor: Colors.vermilion,
    borderColor: Colors.vermilion,
  },
  optionChipText: {
    color: Colors.ink,
    fontSize: 14,
  },
  optionChipTextActive: {
    color: Colors.paper,
    fontWeight: '600',
  },
  // 性别按钮
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  genderButtonActive: {
    backgroundColor: Colors.vermilion,
    borderColor: Colors.vermilion,
  },
  genderButtonText: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: Colors.paper,
    fontWeight: '600',
  },
  // 底部按钮区
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
});
