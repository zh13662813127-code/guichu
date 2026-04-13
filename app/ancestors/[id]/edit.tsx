/**
 * 编辑长辈资料页
 * 复用 new.tsx 的 UI 结构，预填现有数据
 * 保存时调用 updateAncestorInfo
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, X, Info } from 'lucide-react-native';
import { Colors } from '../../../src/constants/colors';
import { useAncestorStore } from '../../../src/stores/ancestorStore';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { KINSHIP_GROUPS, ALL_KINSHIP_TITLES, findKinshipTerm } from '../../../src/constants/kinship';

// ─── 日期选择器（与 new.tsx 相同） ────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

interface DatePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (year: number, month?: number, day?: number) => void;
  title: string;
  /** 初始年份 */
  initialYear?: number;
  /** 初始月份 */
  initialMonth?: number;
  /** 初始日期 */
  initialDay?: number;
}

function DatePickerModal({ visible, onClose, onConfirm, title, initialYear, initialMonth, initialDay }: DatePickerProps) {
  const [selYear, setSelYear] = useState(initialYear ?? CURRENT_YEAR);
  const [selMonth, setSelMonth] = useState<number | null>(initialMonth ?? null);
  const [selDay, setSelDay] = useState<number | null>(initialDay ?? null);

  // 当 visible 变化时同步初始值
  useEffect(() => {
    if (visible) {
      setSelYear(initialYear ?? CURRENT_YEAR);
      setSelMonth(initialMonth ?? null);
      setSelDay(initialDay ?? null);
    }
  }, [visible, initialYear, initialMonth, initialDay]);

  const days = useMemo(() => {
    if (!selMonth) return [];
    return Array.from({ length: getDaysInMonth(selYear, selMonth) }, (_, i) => i + 1);
  }, [selYear, selMonth]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={dpStyles.overlay}>
        <View style={dpStyles.container}>
          <View style={dpStyles.header}>
            <Text style={dpStyles.title}>{title}</Text>
            <Pressable onPress={onClose}><X color={Colors.inkLight} size={22} /></Pressable>
          </View>
          <View style={dpStyles.columns}>
            {/* 年 */}
            <View style={dpStyles.column}>
              <Text style={dpStyles.colLabel}>年</Text>
              <ScrollView style={dpStyles.scrollCol} showsVerticalScrollIndicator={false}>
                <Pressable style={[dpStyles.item, selYear === 0 && dpStyles.itemActive]} onPress={() => { setSelYear(0); setSelMonth(null); setSelDay(null); }}>
                  <Text style={[dpStyles.itemText, selYear === 0 && dpStyles.itemTextActive]}>--</Text>
                </Pressable>
                {YEARS.map(y => (
                  <Pressable key={y} style={[dpStyles.item, selYear === y && dpStyles.itemActive]} onPress={() => { setSelYear(y); setSelDay(null); }}>
                    <Text style={[dpStyles.itemText, selYear === y && dpStyles.itemTextActive]}>{y}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            {/* 月 */}
            <View style={dpStyles.column}>
              <Text style={dpStyles.colLabel}>月</Text>
              <ScrollView style={dpStyles.scrollCol} showsVerticalScrollIndicator={false}>
                <Pressable style={[dpStyles.item, selMonth === null && dpStyles.itemActive]} onPress={() => { setSelMonth(null); setSelDay(null); }}>
                  <Text style={[dpStyles.itemText, selMonth === null && dpStyles.itemTextActive]}>--</Text>
                </Pressable>
                {MONTHS.map(m => (
                  <Pressable key={m} style={[dpStyles.item, selMonth === m && dpStyles.itemActive]} onPress={() => { setSelMonth(m); setSelDay(null); }}>
                    <Text style={[dpStyles.itemText, selMonth === m && dpStyles.itemTextActive]}>{m}月</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            {/* 日 */}
            <View style={dpStyles.column}>
              <Text style={dpStyles.colLabel}>日</Text>
              <ScrollView style={dpStyles.scrollCol} showsVerticalScrollIndicator={false}>
                <Pressable style={[dpStyles.item, selDay === null && dpStyles.itemActive]} onPress={() => setSelDay(null)}>
                  <Text style={[dpStyles.itemText, selDay === null && dpStyles.itemTextActive]}>--</Text>
                </Pressable>
                {days.map(d => (
                  <Pressable key={d} style={[dpStyles.item, selDay === d && dpStyles.itemActive]} onPress={() => setSelDay(d)}>
                    <Text style={[dpStyles.itemText, selDay === d && dpStyles.itemTextActive]}>{d}日</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Pressable style={dpStyles.confirmBtn} onPress={() => onConfirm(selYear, selMonth ?? undefined, selDay ?? undefined)}>
            <Text style={dpStyles.confirmText}>确定</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const dpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  container: { backgroundColor: Colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  title: { color: Colors.ink, fontSize: 17, fontWeight: '600' },
  columns: { flexDirection: 'row', height: 250 },
  column: { flex: 1 },
  colLabel: { textAlign: 'center', color: Colors.inkLight, fontSize: 13, fontWeight: '500', paddingVertical: 8 },
  scrollCol: { flex: 1, paddingHorizontal: 4 },
  item: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginHorizontal: 4, marginVertical: 1, alignItems: 'center' },
  itemActive: { backgroundColor: Colors.vermilion },
  itemText: { color: Colors.ink, fontSize: 15 },
  itemTextActive: { color: Colors.paper, fontWeight: '600' },
  confirmBtn: { marginHorizontal: 20, marginTop: 12, backgroundColor: Colors.vermilion, borderRadius: 9999, paddingVertical: 14, alignItems: 'center' },
  confirmText: { color: Colors.paper, fontSize: 16, fontWeight: '600' },
});

// ─── 辅助函数 ────────────────────────────────────────────

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

/** 从日期字符串解析年月日 */
function parseDateString(dateStr: string | null): { year?: number; month?: number; day?: number } {
  if (!dateStr) return {};
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parts[1] ? parseInt(parts[1]) : undefined;
  const day = parts[2] ? parseInt(parts[2]) : undefined;
  return {
    year: isNaN(year) ? undefined : year,
    month: month && !isNaN(month) && month > 0 ? month : undefined,
    day: day && !isNaN(day) && day > 0 ? day : undefined,
  };
}

// ─── 主组件 ──────────────────────────────────────────────

export default function EditAncestorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { ancestors, loadAncestors, updateAncestorInfo } = useAncestorStore();

  // 找到当前长辈
  const ancestor = useMemo(
    () => ancestors.find((a) => a.id === id) ?? null,
    [ancestors, id],
  );

  // 解析已有的去世日期
  const existingDeathDate = useMemo(() => parseDateString(ancestor?.death_date ?? null), [ancestor?.death_date]);

  // 表单状态 — 从现有数据预填
  const [name, setName] = useState(ancestor?.name ?? '');
  const [relationship, setRelationship] = useState(ancestor?.relationship ?? '');
  const [customRelationship, setCustomRelationship] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | ''>((ancestor?.gender === 'other' ? '' : ancestor?.gender) ?? '');
  const [honor, setHonor] = useState(ancestor?.honor ?? '');

  // 展开的辈分分组
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['父母辈', '祖辈']));
  const [hoveredDesc, setHoveredDesc] = useState<string | null>(null);

  // 日期状态 — 从现有数据预填
  const [birthYear, setBirthYear] = useState<number | undefined>(ancestor?.birth_year ?? undefined);
  const [birthMonth, setBirthMonth] = useState<number | undefined>();
  const [birthDay, setBirthDay] = useState<number | undefined>();
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [deathYear, setDeathYear] = useState<number | undefined>(ancestor?.death_year ?? existingDeathDate.year);
  const [deathMonth, setDeathMonth] = useState<number | undefined>(existingDeathDate.month);
  const [deathDay, setDeathDay] = useState<number | undefined>(existingDeathDate.day);
  const [showDeathPicker, setShowDeathPicker] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // 判断关系是否为自定义（不在预设列表中）
  useEffect(() => {
    if (ancestor?.relationship && !ALL_KINSHIP_TITLES.includes(ancestor.relationship)) {
      setShowCustomInput(true);
      setCustomRelationship(ancestor.relationship);
      setRelationship('');
    }
  }, [ancestor?.relationship]);

  const finalRelationship = showCustomInput ? customRelationship : relationship;
  const birthDisplay = formatDateDisplay(birthYear, birthMonth, birthDay);
  const deathDisplay = formatDateDisplay(deathYear, deathMonth, deathDay);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const selectRelationship = (title: string) => {
    setRelationship(title);
    setShowCustomInput(false);
    setCustomRelationship('');
    const term = findKinshipTerm(title);
    if (term?.gender) setGender(term.gender);
    setHoveredDesc(null);
  };

  const handleSave = useCallback(async () => {
    if (!name.trim() || !id) return;
    setIsSaving(true);
    try {
      await updateAncestorInfo(id, {
        name: name.trim(),
        relationship: finalRelationship || undefined,
        gender: gender || undefined,
        birthYear,
        deathYear,
        deathDate: deathYear ? toDateString(deathYear, deathMonth, deathDay) : undefined,
        honor: honor.trim() || undefined,
      });
      router.back();
    } catch (e) {
      console.error('保存失败:', e);
    } finally {
      setIsSaving(false);
    }
  }, [id, name, finalRelationship, gender, birthYear, deathYear, deathMonth, deathDay, honor, updateAncestorInfo, router]);

  // 长辈不存在的兜底
  if (!ancestor) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>长辈信息不存在</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={s.backLink}>返回</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* 姓名 */}
        <View style={s.field}>
          <Text style={s.label}>姓名 *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="请输入长辈姓名" placeholderTextColor={Colors.inkMute} />
        </View>

        {/* 与我的关系 — 分组展开式 */}
        <View style={s.field}>
          <Text style={s.label}>与我的关系</Text>

          {/* 已选择的关系 + 描述 */}
          {(relationship || showCustomInput) && (
            <View style={s.selectedRelBox}>
              <Text style={s.selectedRelTitle}>
                {showCustomInput ? `自定义：${customRelationship || '...'}` : relationship}
              </Text>
              {!showCustomInput && findKinshipTerm(relationship) && (
                <Text style={s.selectedRelDesc}>
                  {findKinshipTerm(relationship)!.description}
                </Text>
              )}
            </View>
          )}

          {/* 分组列表 */}
          {KINSHIP_GROUPS.map(group => {
            const isExpanded = expandedGroups.has(group.label);
            const isLastGroup = group.label === '其他';

            return (
              <View key={group.label} style={s.groupContainer}>
                <Pressable
                  style={s.groupHeader}
                  onPress={() => toggleGroup(group.label)}
                >
                  <View>
                    <Text style={s.groupTitle}>{group.label}</Text>
                    {group.subtitle && <Text style={s.groupSubtitle}>{group.subtitle}</Text>}
                  </View>
                  <ChevronRight
                    color={Colors.inkMute}
                    size={16}
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={s.termsGrid}>
                    {group.terms.map(term => {
                      const isSelected = relationship === term.title && !showCustomInput;
                      return (
                        <Pressable
                          key={term.title}
                          style={[s.termChip, isSelected && s.termChipActive]}
                          onPress={() => selectRelationship(term.title)}
                          onLongPress={() => setHoveredDesc(term.description)}
                          {...(Platform.OS === 'web' ? {
                            onHoverIn: () => setHoveredDesc(`${term.title}：${term.description}`),
                            onHoverOut: () => setHoveredDesc(null),
                          } as any : {})}
                        >
                          <Text style={[s.termText, isSelected && s.termTextActive]}>
                            {term.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {isLastGroup && (
                      <Pressable
                        style={[s.termChip, showCustomInput && s.termChipActive]}
                        onPress={() => { setShowCustomInput(true); setRelationship(''); }}
                      >
                        <Text style={[s.termText, showCustomInput && s.termTextActive]}>
                          自定义...
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* 自定义输入框 */}
          {showCustomInput && (
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              value={customRelationship}
              onChangeText={setCustomRelationship}
              placeholder="输入自定义关系称谓"
              placeholderTextColor={Colors.inkMute}
            />
          )}

          {/* 悬停提示 */}
          {hoveredDesc && (
            <View style={s.tooltipBox}>
              <Info color={Colors.amber} size={14} />
              <Text style={s.tooltipText}>{hoveredDesc}</Text>
            </View>
          )}
        </View>

        {/* 性别 */}
        <View style={s.field}>
          <Text style={s.label}>性别</Text>
          <View style={s.genderRow}>
            {[{ label: '男', value: 'male' as const }, { label: '女', value: 'female' as const }].map(opt => (
              <Pressable key={opt.value} style={[s.genderBtn, gender === opt.value && s.genderBtnActive]} onPress={() => setGender(opt.value)}>
                <Text style={[s.genderText, gender === opt.value && s.genderTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 出生日期 */}
        <View style={s.field}>
          <Text style={s.label}>出生日期</Text>
          <Pressable style={s.dateInput} onPress={() => setShowBirthPicker(true)}>
            <Text style={birthDisplay ? s.dateText : s.datePlaceholder}>{birthDisplay || '点击选择'}</Text>
            <ChevronDown color={Colors.inkMute} size={18} />
          </Pressable>
          {birthYear ? <Pressable onPress={() => { setBirthYear(undefined); setBirthMonth(undefined); setBirthDay(undefined); }}><Text style={s.clearText}>清除</Text></Pressable> : null}
        </View>

        {/* 去世日期 */}
        <View style={s.field}>
          <Text style={s.label}>去世日期</Text>
          <Pressable style={s.dateInput} onPress={() => setShowDeathPicker(true)}>
            <Text style={deathDisplay ? s.dateText : s.datePlaceholder}>{deathDisplay || '健在则留空'}</Text>
            <ChevronDown color={Colors.inkMute} size={18} />
          </Pressable>
          {deathYear ? <Pressable onPress={() => { setDeathYear(undefined); setDeathMonth(undefined); setDeathDay(undefined); }}><Text style={s.clearText}>清除</Text></Pressable> : null}
          <Text style={s.hint}>填写后将自动生成习俗提醒日历</Text>
        </View>

        {/* 荣誉/头衔 */}
        <View style={s.field}>
          <Text style={s.label}>荣誉 / 头衔</Text>
          <TextInput
            style={s.input}
            value={honor}
            onChangeText={setHonor}
            placeholder="如：抗美援朝老兵、村里第一个大学生、乡村教师40年..."
            placeholderTextColor={Colors.inkMute}
            multiline
            numberOfLines={2}
          />
          <Text style={s.hint}>记录长辈一生中最值得铭记的身份或成就</Text>
        </View>

      </ScrollView>

      {/* 保存 */}
      <View style={s.footer}>
        <PrimaryButton title="保存修改" onPress={handleSave} loading={isSaving} disabled={!name.trim()} />
      </View>

      {/* 日期选择器 */}
      <DatePickerModal
        visible={showBirthPicker}
        title="选择出生日期"
        initialYear={birthYear}
        initialMonth={birthMonth}
        initialDay={birthDay}
        onClose={() => setShowBirthPicker(false)}
        onConfirm={(y, m, d) => { setBirthYear(y || undefined); setBirthMonth(m); setBirthDay(d); setShowBirthPicker(false); }}
      />
      <DatePickerModal
        visible={showDeathPicker}
        title="选择去世日期"
        initialYear={deathYear}
        initialMonth={deathMonth}
        initialDay={deathDay}
        onClose={() => setShowDeathPicker(false)}
        onConfirm={(y, m, d) => { setDeathYear(y || undefined); setDeathMonth(m); setDeathDay(d); setShowDeathPicker(false); }}
      />
    </SafeAreaView>
  );
}

// ─── 样式 ──────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  // 兜底空态
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: Colors.inkMute,
    fontSize: 16,
  },
  backLink: {
    color: Colors.vermilion,
    fontSize: 15,
    fontWeight: '500',
  },

  // 通用
  field: { marginBottom: 20 },
  label: { color: Colors.ink, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: Colors.paperDark, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.ink },
  hint: { color: Colors.inkMute, fontSize: 12, marginTop: 6, paddingLeft: 4 },

  // 已选关系显示
  selectedRelBox: {
    backgroundColor: Colors.vermilion + '12',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.vermilion,
  },
  selectedRelTitle: { color: Colors.vermilion, fontSize: 16, fontWeight: '600' },
  selectedRelDesc: { color: Colors.inkLight, fontSize: 13, marginTop: 4 },

  // 分组
  groupContainer: {
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  groupTitle: { color: Colors.ink, fontSize: 15, fontWeight: '600' },
  groupSubtitle: { color: Colors.inkMute, fontSize: 12, marginTop: 2 },

  // 称谓网格
  termsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  termChip: {
    backgroundColor: Colors.paperDark,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  termChipActive: {
    backgroundColor: Colors.vermilion,
    borderColor: Colors.vermilion,
  },
  termText: { color: Colors.ink, fontSize: 14 },
  termTextActive: { color: Colors.paper, fontWeight: '600' },

  // 悬停提示
  tooltipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.amber + '15',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  tooltipText: { color: Colors.ink, fontSize: 13, flex: 1 },

  // 性别
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, backgroundColor: Colors.paperDark, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.divider },
  genderBtnActive: { backgroundColor: Colors.vermilion, borderColor: Colors.vermilion },
  genderText: { color: Colors.ink, fontSize: 16, fontWeight: '500' },
  genderTextActive: { color: Colors.paper, fontWeight: '600' },

  // 日期
  dateInput: { backgroundColor: Colors.paperDark, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { color: Colors.ink, fontSize: 16 },
  datePlaceholder: { color: Colors.inkMute, fontSize: 16 },
  clearText: { color: Colors.vermilion, fontSize: 13, marginTop: 6, paddingLeft: 4 },

  // 底部
  footer: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.divider },
});
