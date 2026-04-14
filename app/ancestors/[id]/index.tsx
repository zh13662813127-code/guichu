/**
 * 长辈详情页 — 完整的长辈资料与功能入口
 * 包含：基本信息、墓地位置、寻路指南、访谈蒸馏、对话、声音、习俗日历
 * 优化：头像光晕、功能卡片彩色竖条、统一间距
 */

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MapPin,
  Map,
  MessageCircle,
  Mic,
  Calendar,
  ChevronLeft,
  Trash2,
  Sparkles,
  Volume2,
  Edit3,
  RefreshCw,
  Camera,
} from 'lucide-react-native';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../../src/constants/colors';
import { Fonts, Labels, Descriptions } from '../../../src/constants/typography';
import { useAncestorStore, type Ancestor } from '../../../src/stores/ancestorStore';
import { AvatarCircle } from '../../../src/components/AvatarCircle';
import { ConfirmModal } from '../../../src/components/ConfirmModal';
import { FeatureCard } from '../../../src/components/FeatureCard';
import { calculateRituals, type RitualEvent } from '../../../src/features/rituals/calcRituals';

// ─── 辅助函数 ───────────────────────────────────────────

/** 格式化生卒年显示 */
function formatLifespan(ancestor: Ancestor): string {
  const parts: string[] = [];
  if (ancestor.birth_year) parts.push(`${ancestor.birth_year}年生`);
  if (ancestor.death_year) parts.push(`${ancestor.death_year}年卒`);
  return parts.join(' · ');
}

/** 计算享年 */
function calcAge(ancestor: Ancestor): string | null {
  if (ancestor.birth_year && (ancestor.death_year || ancestor.death_date)) {
    const deathY = ancestor.death_year || (ancestor.death_date ? parseInt(ancestor.death_date.split('-')[0]) : 0);
    if (deathY && ancestor.birth_year) {
      return `享年 ${deathY - ancestor.birth_year} 岁`;
    }
  }
  return null;
}

/** 获取下一个即将到来的习俗事件 */
function getNextRitual(events: RitualEvent[]): RitualEvent | null {
  const upcoming = events.filter((e) => !e.isPast);
  return upcoming.length > 0 ? upcoming[0] : null;
}

// ─── 主组件 ─────────────────────────────────────────────

export default function AncestorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { ancestors, loadAncestors, removeAncestor, updateAncestorSkill, updateAncestorInfo } = useAncestorStore();

  useEffect(() => {
    loadAncestors();
  }, []);

  // 找到当前长辈
  const ancestor = useMemo(
    () => ancestors.find((a) => a.id === id) ?? null,
    [ancestors, id],
  );

  // 计算习俗事件
  const ritualEvents = useMemo(() => {
    if (!ancestor?.death_date) return [];
    return calculateRituals(ancestor.death_date);
  }, [ancestor?.death_date]);

  const nextRitual = useMemo(() => getNextRitual(ritualEvents), [ritualEvents]);

  // 删除确认弹窗状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 判断功能状态
  const hasSkill = !!ancestor?.skill_content;
  const hasVoice = !!ancestor?.voice_id;
  // 墓地/路线数据暂时用 placeholder，后续从 DB 查询
  const hasGrave = false;
  const waypointCount = 0;

  /** 确认删除长辈 */
  const confirmDelete = useCallback(async () => {
    if (!ancestor) return;
    setShowDeleteModal(false);
    await removeAncestor(ancestor.id);
    router.back();
  }, [ancestor, removeAncestor, router]);

  // 长辈不存在的兜底
  if (!ancestor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>长辈信息不存在</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>返回</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const lifespan = formatLifespan(ancestor);
  const ageText = calcAge(ancestor);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.navBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color={Colors.ink} size={24} />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {ancestor.name}
        </Text>
        <Pressable
          style={styles.editButton}
          onPress={() => router.push(`/ancestors/${id}/edit` as any)}
        >
          <Edit3 color={Colors.vermilion} size={20} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Web 端居中容器 */}
        <View style={styles.innerContainer}>
          {/* ── 顶部：长辈基本信息 —— 头像光晕 + 享年 ── */}
          <View style={styles.profileSection}>
            {/* 头像：点击可更换 —— 外层 vermilion 光晕 */}
            <Pressable
              style={styles.avatarContainer}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  quality: 0.8,
                  allowsEditing: true,
                  aspect: [1, 1],
                });
                if (!result.canceled && result.assets[0]) {
                  const uri = result.assets[0].uri;

                  // 持久化头像
                  let savedPath = uri;
                  if (Platform.OS !== 'web') {
                    // Native 端：复制到 app 目录
                    const FileSystem = await import('expo-file-system');
                    const filename = `avatar_${ancestor.id}_${Date.now()}.jpg`;
                    const destDir = `${FileSystem.documentDirectory}photos/`;
                    const destPath = destDir + filename;
                    // 确保目录存在
                    await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});
                    await FileSystem.copyAsync({ from: uri, to: destPath });
                    savedPath = destPath;
                  }

                  // 更新 store（Web 端直接存 data URI，Native 端存本地路径）
                  await updateAncestorInfo(ancestor.id, { avatarPath: savedPath });
                  loadAncestors();
                }
              }}
            >
              {/* 光晕层 */}
              <View style={styles.avatarGlow}>
                {ancestor.avatar_path ? (
                  <Image
                    source={{ uri: ancestor.avatar_path }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <AvatarCircle name={ancestor.name} size={100} />
                )}
              </View>
              {/* 相机小图标 */}
              <View style={styles.avatarBadge}>
                <Camera color={Colors.paper} size={14} />
              </View>
            </Pressable>
            <Text style={styles.profileName}>{ancestor.name}</Text>

            {/* 关系 · 生卒年 */}
            <Text style={styles.profileMeta}>
              {[ancestor.relationship, lifespan].filter(Boolean).join(' · ')}
            </Text>

            {/* 享年 */}
            {ageText && (
              <Text style={styles.profileAge}>{ageText}</Text>
            )}

            {/* 标签行 */}
            <View style={styles.tagRow}>
              {hasSkill && (
                <View style={[styles.tag, styles.tagJade]}>
                  <Sparkles color={Colors.jade} size={12} />
                  <Text style={styles.tagTextJade}>已铸魂</Text>
                </View>
              )}
              {hasVoice && (
                <View style={[styles.tag, styles.tagAmber]}>
                  <Volume2 color={Colors.amber} size={12} />
                  <Text style={styles.tagTextAmber}>有声音</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── 功能卡片列表 —— 带彩色竖条装饰 ── */}
          <View style={styles.cardsSection}>
            {/* 1. 墓地位置 — vermilion 竖条 */}
            <FeatureCard
              icon={<MapPin color={Colors.vermilion} size={22} />}
              title={Labels.cardGrave}
              description={
                hasGrave ? '已记录位置坐标' : Descriptions.cardGrave
              }
              actionLabel={hasGrave ? '导航到此处' : '去记录'}
              onAction={() =>
                router.push(`/ancestors/${id}/confirm-location` as any)
              }
              status={hasGrave ? 'done' : 'pending'}
              accentColor={Colors.vermilion}
            />

            {/* 2. 寻路指南 — inkLight 竖条 */}
            <FeatureCard
              icon={<Map color={Colors.inkLight} size={22} />}
              title={Labels.cardRoute}
              description={
                waypointCount > 0
                  ? `已记录 ${waypointCount} 个路线点`
                  : Descriptions.cardRoute
              }
              actionLabel={waypointCount > 0 ? '查看路线' : '开始记录'}
              onAction={() => {
                Alert.alert('功能开发中', '寻路指南记录功能即将上线');
              }}
              status={waypointCount > 0 ? 'done' : 'pending'}
              accentColor={Colors.inkLight}
            />

            {/* 3. 蒸馏人格 · .skill — jade 竖条 */}
            <FeatureCard
              icon={<Sparkles color={Colors.jade} size={22} />}
              title={Labels.cardDistill}
              accentColor={Colors.jade}
            >
              {hasSkill ? (
                <View>
                  <View style={styles.skillPreview}>
                    <Text style={styles.skillPreviewText} numberOfLines={4}>
                      {ancestor.skill_content!.slice(0, 100)}
                      {ancestor.skill_content!.length > 100 ? '...' : ''}
                    </Text>
                  </View>
                  <View style={styles.skillActions}>
                    <Pressable
                      style={styles.skillActionButton}
                      onPress={() => {
                        router.push(`/ancestors/${id}/skill-preview` as any);
                      }}
                    >
                      <Edit3 color={Colors.vermilion} size={14} />
                      <Text style={styles.skillActionText}>查看/编辑</Text>
                    </Pressable>
                    <Pressable
                      style={styles.skillActionButton}
                      onPress={() => {
                        router.push(`/ancestors/${id}/distill` as any);
                      }}
                    >
                      <RefreshCw color={Colors.vermilion} size={14} />
                      <Text style={styles.skillActionText}>重新铸魂</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.interviewHint}>
                    {Descriptions.cardDistill}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.interviewButton,
                      pressed && styles.interviewButtonPressed,
                    ]}
                    onPress={() => {
                      router.push(`/ancestors/${id}/distill` as any);
                    }}
                  >
                    <Sparkles color={Colors.paper} size={18} />
                    <Text style={styles.interviewButtonText}>
                      {Labels.btnStartDistill}
                    </Text>
                  </Pressable>
                </View>
              )}
            </FeatureCard>

            {/* 4. 对话 — amber 竖条 */}
            <FeatureCard
              icon={<MessageCircle color={Colors.amber} size={22} />}
              title={Labels.cardChat}
              description={
                hasSkill
                  ? `与${ancestor.name}叙话`
                  : Descriptions.cardChat
              }
              actionLabel={hasSkill ? `与${ancestor.name}叙话` : undefined}
              onAction={
                hasSkill
                  ? () => {
                      Alert.alert('功能开发中', '对话功能即将上线');
                    }
                  : undefined
              }
              status={hasSkill ? 'pending' : 'disabled'}
              accentColor={Colors.amber}
            />

            {/* 5. 声音档案 — crimson 竖条 */}
            <FeatureCard
              icon={<Mic color={Colors.crimson} size={22} />}
              title={Labels.cardVoice}
              description={
                hasVoice ? '已训练声音模型' : Descriptions.cardVoice
              }
              actionLabel="训练声音"
              onAction={() => {
                Alert.alert('功能开发中', '声音训练功能即将上线');
              }}
              status={hasVoice ? 'done' : 'pending'}
              accentColor={Colors.crimson}
            />

            {/* 6. 习俗日历 — amber 竖条 */}
            <FeatureCard
              icon={<Calendar color={Colors.amber} size={22} />}
              title={Labels.cardRituals}
              accentColor={Colors.amber}
            >
              {nextRitual ? (
                <View>
                  <View style={styles.ritualPreview}>
                    <Text style={styles.ritualPreviewName}>
                      {nextRitual.name}
                    </Text>
                    <Text style={styles.ritualPreviewCountdown}>
                      {nextRitual.daysFromNow === 0
                        ? '就在今天'
                        : `${nextRitual.daysFromNow} 天后`}
                    </Text>
                  </View>
                  <Text style={styles.ritualPreviewDate}>
                    {nextRitual.dateSolar}
                    {nextRitual.dateLunar ? ` · ${nextRitual.dateLunar}` : ''}
                  </Text>
                  <Pressable
                    style={styles.viewAllRituals}
                    onPress={() => {
                      router.push('/' as any);
                    }}
                  >
                    <Text style={styles.viewAllRitualsText}>查看全部日历</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.noRitualText}>
                  {ancestor.death_date
                    ? '暂无即将到来的习俗日子'
                    : '添加去世日期后，习俗日历将自动生成'}
                </Text>
              )}
            </FeatureCard>
          </View>

          {/* ── 底部：删除按钮 ── */}
          <Pressable style={styles.deleteButton} onPress={() => setShowDeleteModal(true)}>
            <Trash2 color={Colors.crimson} size={16} />
            <Text style={styles.deleteButtonText}>删除此长辈</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 删除确认弹窗 — 替代 Alert.alert，兼容 Web 端 */}
      <ConfirmModal
        visible={showDeleteModal}
        title={`确认删除「${ancestor.name}」？`}
        message="删除后所有相关数据（访谈、对话、位置记录）将一并删除，且无法恢复。"
        confirmLabel="删除"
        cancelLabel="取消"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── 样式 ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },

  // Web 端居中
  innerContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

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

  // 顶部导航栏
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    padding: 4,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  editButton: {
    padding: 4,
    width: 32,
    alignItems: 'center',
  },

  // 滚动容器
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // 基本信息区 —— 头像光晕
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  // 头像外围朱砂光晕
  avatarGlow: {
    borderRadius: 54,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.vermilion + '30',
    // 光晕阴影效果
    shadowColor: Colors.vermilion,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.paper,
  },
  profileName: {
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '600',
    marginTop: 14,
    fontFamily: Fonts.classical,
  },
  profileMeta: {
    color: Colors.inkLight,
    fontSize: 15,
    marginTop: 6,
  },
  // 享年
  profileAge: {
    color: Colors.inkMute,
    fontSize: 13,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagJade: {
    backgroundColor: Colors.jade + '18',
  },
  tagTextJade: {
    color: Colors.jade,
    fontSize: 12,
    fontWeight: '500',
  },
  tagAmber: {
    backgroundColor: Colors.amber + '18',
  },
  tagTextAmber: {
    color: Colors.amber,
    fontSize: 12,
    fontWeight: '500',
  },

  // 功能卡片区 —— 统一间距 12
  cardsSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
  },

  // 访谈 .skill 相关
  skillPreview: {
    backgroundColor: Colors.paper,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  skillPreviewText: {
    color: Colors.inkLight,
    fontSize: 13,
    lineHeight: 20,
  },
  skillActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skillActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.vermilion,
  },
  skillActionText: {
    color: Colors.vermilion,
    fontSize: 13,
    fontWeight: '500',
  },
  interviewHint: {
    color: Colors.inkLight,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  interviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.vermilion,
    paddingVertical: 12,
    borderRadius: 24,
  },
  interviewButtonPressed: {
    backgroundColor: Colors.vermilionPressed,
  },
  interviewButtonText: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },

  // 习俗日历预览
  ritualPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ritualPreviewName: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  ritualPreviewCountdown: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '500',
  },
  ritualPreviewDate: {
    color: Colors.inkMute,
    fontSize: 13,
    marginBottom: 10,
  },
  viewAllRituals: {
    paddingVertical: 6,
  },
  viewAllRitualsText: {
    color: Colors.vermilion,
    fontSize: 14,
    fontWeight: '500',
  },
  noRitualText: {
    color: Colors.inkMute,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },

  // 删除按钮
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: Colors.crimson,
    fontSize: 15,
    fontWeight: '500',
  },
});
