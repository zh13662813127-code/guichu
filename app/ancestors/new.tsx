/**
 * 新建长辈页
 * 姓名、关系（含自定义）、性别、出生日期（年月日选择器）、去世日期
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, X } from 'lucide-react-native';
import { Colors } from '../../src/constants/colors';
import { useAncestorStore } from '../../src/stores/ancestorStore';
import { PrimaryButton } from '../../src/components/PrimaryButton';

/** 关系预设选项 */
const RELATIONSHIP_PRESETS = ['爷爷', '奶奶', '外公', '外婆', '父亲', '母亲', '其他'] as const;

/** 年份范围 */
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 根据年月计算天数 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── 日期选择器组件 ──────────────────────────────────────

interface DatePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (year: number, month?: number, day?: number) => void;
  title: string;
  /** 是否允许月日为空 */
  allowPartial?: boolean;
}

function DatePickerModal({ visible, onClose, onConfirm, title, allowPartial }: DatePickerProps) {
  const [selYear, setSelYear] = useState(CURRENT_YEAR);
  const [selMonth, setSelMonth] = useState<number | null>(null);
  const [selDay, setSelDay] = useState<number | null>(null);

  const days = useMemo(() => {
    if (!selMonth) return [];
    const count = getDaysInMonth(selYear, selMonth);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selYear, selMonth]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.container}>
          {/* 标题栏 */}
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>{title}</Text>
            <Pressable onPress={onClose}>
              <X color={Colors.inkLight} size={22} />
            </Pressable>
          </View>

          {/* 三列选择器 */}
          <View style={pickerStyles.columns}>
            {/* 年 */}
            <View style={pickerStyles.column}>
              <Text style={pickerStyles.columnLabel}>年</Text>
              <ScrollView style={pickerStyles.scrollCol} showsVerticalScrollIndicator={false}>
                {YEARS.map((y) => (
                  <Pressable
                    key={y}
                    style={[pickerStyles.item, selYear === y && pickerStyles.itemActive]}
                    onPress={() => { setSelYear(y); setSelDay(null); }}
                  >
                    <Text style={[pickerStyles.itemText, selYear === y && pickerStyles.itemTextActive]}>
                      {y}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* 月 */}
            <View style={pickerStyles.column}>
              <Text style={pickerStyles.columnLabel}>月</Text>
              <ScrollView style={pickerStyles.scrollCol} showsVerticalScrollIndicator={false}>
                {allowPartial && (
                  <Pressable
                    style={[pickerStyles.item, selMonth === null && pickerStyles.itemActive]}
                    onPress={() => { setSelMonth(null); setSelDay(null); }}
                  >
                    <Text style={[pickerStyles.itemText, selMonth === null && pickerStyles.itemTextActive]}>--</Text>
                  </Pressable>
                )}
                {MONTHS.map((m) => (
                  <Pressable
                    key={m}
                    style={[pickerStyles.item, selMonth === m && pickerStyles.itemActive]}
                    onPress={() => { setSelMonth(m); setSelDay(null); }}
                  >
                    <Text style={[pickerStyles.itemText, selMonth === m && pickerStyles.itemTextActive]}>
                      {m}月
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* 日 */}
            <View style={pickerStyles.column}>
              <Text style={pickerStyles.columnLabel}>日</Text>
              <ScrollView style={pickerStyles.scrollCol} showsVerticalScrollIndicator={false}>
                {allowPartial && (
                  <Pressable
                    style={[pickerStyles.item, selDay === null && pickerStyles.itemActive]}
                    onPress={() => setSelDay(null)}
                  >
                    <Text style={[pickerStyles.itemText, selDay === null && pickerStyles.itemTextActive]}>--</Text>
                  </Pressable>
                )}
                {days.map((d) => (
                  <Pressable
                    key={d}
                    style={[pickerStyles.item, selDay === d && pickerStyles.itemActive]}
                    onPress={() => setSelDay(d)}
                  >
                    <Text style={[pickerStyles.itemText, selDay === d && pickerStyles.itemTextActive]}>
                      {d}日
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* 确认按钮 */}
          <Pressable
            style={pickerStyles.confirmButton}
            onPress={() => onConfirm(selYear, selMonth ?? undefined, selDay ?? undefined)}
          >
            <Text style={pickerStyles.confirmText}>确定</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  title: { color: Colors.ink, fontSize: 17, fontWeight: '600' },
  columns: { flexDirection: 'row', height: 250 },
  column: { flex: 1 },
  columnLabel: {
    textAlign: 'center',
    color: Colors.inkLight,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 8,
  },
  scrollCol: { flex: 1, paddingHorizontal: 4 },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 1,
    alignItems: 'center',
  },
  itemActive: { backgroundColor: Colors.vermilion },
  itemText: { color: Colors.ink, fontSize: 15 },
  itemTextActive: { color: Colors.paper, fontWeight: '600' },
  confirmButton: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.vermilion,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: { color: Colors.paper, fontSize: 16, fontWeight: '600' },
});

// ─── 格式化日期显示 ─────────────────────────────────────

function formatDateDisplay(year?: number, month?: number, day?: number): string {
  if (!year) return '';
  let s = `${year}年`;
  if (month) s += `${month}月`;
  if (day) s += `${day}日`;
  return s;
}

function toDateString(year?: number, month?: number, day?: number): string {
  if (!year) return '';
  const m = month ? String(month).padStart(2, '0') : '01';
  const d = day ? String(day).padStart(2, '0') : '01';
  return `${year}-${m}-${d}`;
}

// ─── 主组件 ─────────────────────────────────────────────

export default function NewAncestorScreen() {
  const router = useRouter();
  const { addAncestor } = useAncestorStore();

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');
  const [isOtherRelationship, setIsOtherRelationship] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | ''>('');

  // 出生日期
  const [birthYear, setBirthYear] = useState<number | undefined>();
  const [birthMonth, setBirthMonth] = useState<number | undefined>();
  const [birthDay, setBirthDay] = useState<number | undefined>();
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  // 去世日期
  const [deathYear, setDeathYear] = useState<number | undefined>();
  const [deathMonth, setDeathMonth] = useState<number | undefined>();
  const [deathDay, setDeathDay] = useState<number | undefined>();
  const [showDeathPicker, setShowDeathPicker] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const finalRelationship = isOtherRelationship ? customRelationship : relationship;
  const birthDisplay = formatDateDisplay(birthYear, birthMonth, birthDay);
  const deathDisplay = formatDateDisplay(deathYear, deathMonth, deathDay);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await addAncestor({
        name: name.trim(),
        relationship: finalRelationship || undefined,
        gender: gender || undefined,
        birthYear,
        deathYear,
        deathDate: deathYear ? toDateString(deathYear, deathMonth, deathDay) : undefined,
      });
      router.back();
    } catch (e) {
      console.error('保存失败:', e);
    } finally {
      setIsSaving(false);
    }
  }, [name, finalRelationship, gender, birthYear, deathYear, deathMonth, deathDay, addAncestor, router]);

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
          <View style={styles.chipsRow}>
            {RELATIONSHIP_PRESETS.map((rel) => (
              <Pressable
                key={rel}
                style={[
                  styles.chip,
                  (rel === '其他' ? isOtherRelationship : relationship === rel) && styles.chipActive,
                ]}
                onPress={() => {
                  if (rel === '其他') {
                    setIsOtherRelationship(true);
                    setRelationship('');
                  } else {
                    setIsOtherRelationship(false);
                    setRelationship(rel);
                    setCustomRelationship('');
                    // 自动设性别
                    if (['爷爷', '外公', '父亲'].includes(rel)) setGender('male');
                    if (['奶奶', '外婆', '母亲'].includes(rel)) setGender('female');
                  }
                }}
              >
                <Text style={[
                  styles.chipText,
                  (rel === '其他' ? isOtherRelationship : relationship === rel) && styles.chipTextActive,
                ]}>
                  {rel}
                </Text>
              </Pressable>
            ))}
          </View>
          {/* 其他：自定义输入 */}
          {isOtherRelationship && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={customRelationship}
              onChangeText={setCustomRelationship}
              placeholder="请输入关系，如：叔叔、姑姑、师父..."
              placeholderTextColor={Colors.inkMute}
              autoFocus
            />
          )}
        </View>

        {/* 性别 */}
        <View style={styles.field}>
          <Text style={styles.label}>性别</Text>
          <View style={styles.genderRow}>
            {[{ label: '男', value: 'male' as const }, { label: '女', value: 'female' as const }].map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.genderBtn, gender === opt.value && styles.genderBtnActive]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[styles.genderText, gender === opt.value && styles.genderTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 出生日期 */}
        <View style={styles.field}>
          <Text style={styles.label}>出生日期</Text>
          <Pressable style={styles.dateInput} onPress={() => setShowBirthPicker(true)}>
            <Text style={birthDisplay ? styles.dateText : styles.datePlaceholder}>
              {birthDisplay || '点击选择出生日期'}
            </Text>
            <ChevronDown color={Colors.inkMute} size={18} />
          </Pressable>
          {birthYear && (
            <Pressable onPress={() => { setBirthYear(undefined); setBirthMonth(undefined); setBirthDay(undefined); }}>
              <Text style={styles.clearText}>清除</Text>
            </Pressable>
          )}
        </View>

        {/* 去世日期 */}
        <View style={styles.field}>
          <Text style={styles.label}>去世日期</Text>
          <Pressable style={styles.dateInput} onPress={() => setShowDeathPicker(true)}>
            <Text style={deathDisplay ? styles.dateText : styles.datePlaceholder}>
              {deathDisplay || '健在则留空，点击选择'}
            </Text>
            <ChevronDown color={Colors.inkMute} size={18} />
          </Pressable>
          {deathYear && (
            <Pressable onPress={() => { setDeathYear(undefined); setDeathMonth(undefined); setDeathDay(undefined); }}>
              <Text style={styles.clearText}>清除</Text>
            </Pressable>
          )}
          <Text style={styles.hint}>填写后将自动生成习俗提醒日历</Text>
        </View>
      </ScrollView>

      {/* 保存按钮 */}
      <View style={styles.footer}>
        <PrimaryButton title="保存" onPress={handleSave} loading={isSaving} disabled={!name.trim()} />
      </View>

      {/* 日期选择器 Modal */}
      <DatePickerModal
        visible={showBirthPicker}
        title="选择出生日期"
        allowPartial
        onClose={() => setShowBirthPicker(false)}
        onConfirm={(y, m, d) => {
          setBirthYear(y); setBirthMonth(m); setBirthDay(d);
          setShowBirthPicker(false);
        }}
      />
      <DatePickerModal
        visible={showDeathPicker}
        title="选择去世日期"
        allowPartial
        onClose={() => setShowDeathPicker(false)}
        onConfirm={(y, m, d) => {
          setDeathYear(y); setDeathMonth(m); setDeathDay(d);
          setShowDeathPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  field: { marginBottom: 20 },
  label: { color: Colors.ink, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.ink,
  },
  hint: { color: Colors.inkMute, fontSize: 12, marginTop: 6, paddingLeft: 4 },
  // 关系 chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.paperDark,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  chipActive: { backgroundColor: Colors.vermilion, borderColor: Colors.vermilion },
  chipText: { color: Colors.ink, fontSize: 14 },
  chipTextActive: { color: Colors.paper, fontWeight: '600' },
  // 性别
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1,
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  genderBtnActive: { backgroundColor: Colors.vermilion, borderColor: Colors.vermilion },
  genderText: { color: Colors.ink, fontSize: 16, fontWeight: '500' },
  genderTextActive: { color: Colors.paper, fontWeight: '600' },
  // 日期选择
  dateInput: {
    backgroundColor: Colors.paperDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: { color: Colors.ink, fontSize: 16 },
  datePlaceholder: { color: Colors.inkMute, fontSize: 16 },
  clearText: { color: Colors.vermilion, fontSize: 13, marginTop: 6, paddingLeft: 4 },
  // 底部
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
});
