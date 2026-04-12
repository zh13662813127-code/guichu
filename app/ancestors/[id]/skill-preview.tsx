/**
 * .skill 预览/编辑页
 * 展示已生成的人格档案，支持编辑和导出
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../src/constants/colors';
import { useAncestorStore } from '../../../src/stores/ancestorStore';

// ─── Markdown 风格渲染器（简易版）──────────────────────────

/** 将 .skill 文本按行解析为可渲染的元素 */
function SkillRenderer({ text }: { text: string }) {
  const lines = text.split('\n');
  let inFrontmatter = false;
  let frontmatterCount = 0;

  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // 处理 frontmatter（--- 包围的区域）
    if (trimmed === '---') {
      frontmatterCount++;
      if (frontmatterCount <= 2) {
        inFrontmatter = !inFrontmatter;
        if (frontmatterCount === 1) {
          elements.push(
            <View key={`fm-start-${i}`} style={renderStyles.divider} />
          );
        }
        if (frontmatterCount === 2) {
          elements.push(
            <View key={`fm-end-${i}`} style={renderStyles.divider} />
          );
        }
        return;
      }
    }

    if (inFrontmatter) {
      // frontmatter 内的 key: value
      const match = trimmed.match(/^(\w+):\s*(.*)$/);
      if (match) {
        elements.push(
          <View key={`fmkv-${i}`} style={renderStyles.fmRow}>
            <Text style={renderStyles.fmKey}>{match[1]}</Text>
            <Text style={renderStyles.fmValue}>{match[2]}</Text>
          </View>
        );
      }
      return;
    }

    // 标题
    if (trimmed.startsWith('# ')) {
      elements.push(
        <Text key={`h1-${i}`} style={renderStyles.h1}>
          {trimmed.slice(2)}
        </Text>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <Text key={`h2-${i}`} style={renderStyles.h2}>
          {trimmed.slice(3)}
        </Text>
      );
      return;
    }

    // 列表项
    if (trimmed.startsWith('- ')) {
      elements.push(
        <View key={`li-${i}`} style={renderStyles.listItem}>
          <Text style={renderStyles.bullet}>{'  \u2022  '}</Text>
          <Text style={renderStyles.listText}>{trimmed.slice(2)}</Text>
        </View>
      );
      return;
    }

    // 空行
    if (trimmed === '') {
      elements.push(<View key={`sp-${i}`} style={{ height: 8 }} />);
      return;
    }

    // 普通段落
    elements.push(
      <Text key={`p-${i}`} style={renderStyles.paragraph}>
        {line}
      </Text>
    );
  });

  return <>{elements}</>;
}

const renderStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  fmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  fmKey: {
    color: Colors.vermilion,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  fmValue: {
    color: Colors.ink,
    fontSize: 14,
    flex: 1,
  },
  h1: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  h2: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: 8,
  },
  bullet: {
    color: Colors.vermilion,
    fontSize: 14,
    lineHeight: 22,
  },
  listText: {
    color: Colors.ink,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  paragraph: {
    color: Colors.ink,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 4,
  },
});

// ─── 主组件 ───────────────────────────────────────────────

export default function SkillPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ancestors = useAncestorStore((s) => s.ancestors);
  const updateAncestorSkill = useAncestorStore((s) => s.updateAncestorSkill);
  const ancestor = ancestors.find((a) => a.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const skillContent = ancestor?.skill_content || '';

  // ─── 编辑模式 ─────────────────────────────────────

  const startEdit = useCallback(() => {
    setEditText(skillContent);
    setIsEditing(true);
  }, [skillContent]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (id && updateAncestorSkill) {
      await updateAncestorSkill(id, editText);
      setIsEditing(false);
      Alert.alert('已保存', '人格档案已更新。');
    }
  }, [id, updateAncestorSkill, editText]);

  // ─── 导出 ─────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!skillContent) return;

    try {
      if (Platform.OS !== 'web') {
        const FileSystem = await import('expo-file-system');
        const Sharing = await import('expo-sharing');

        const fileName = `${ancestor?.name || '长辈'}.skill.md`;
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(filePath, skillContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'text/markdown',
            dialogTitle: `导出 ${ancestor?.name} 的人格档案`,
          });
        } else {
          Alert.alert('提示', '当前设备不支持分享功能');
        }
      } else {
        // Web 端：创建下载链接
        const blob = new Blob([skillContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ancestor?.name || '长辈'}.skill.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      Alert.alert('导出失败', err?.message || '未知错误');
    }
  }, [skillContent, ancestor]);

  // ─── 渲染 ─────────────────────────────────────────

  if (!ancestor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>未找到长辈信息</Text>
      </SafeAreaView>
    );
  }

  if (!skillContent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>尚未生成人格档案</Text>
          <Text style={styles.emptyHint}>
            通过访谈记录长辈的故事，即可生成人格档案
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push(`/ancestors/${id}/interview`)}
          >
            <Text style={styles.primaryBtnText}>开始访谈</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 编辑模式 ─────────────────────────────────────
  if (isEditing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.editHeader}>
          <Pressable onPress={cancelEdit}>
            <Text style={styles.editHeaderBtn}>取消</Text>
          </Pressable>
          <Text style={styles.editHeaderTitle}>编辑人格档案</Text>
          <Pressable onPress={saveEdit}>
            <Text style={[styles.editHeaderBtn, styles.editHeaderSave]}>
              保存
            </Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.editInput}
          value={editText}
          onChangeText={setEditText}
          multiline
          textAlignVertical="top"
          autoFocus
        />
      </SafeAreaView>
    );
  }

  // ─── 预览模式 ─────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
      >
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>
            {ancestor.name} 的人格档案
          </Text>
        </View>

        <View style={styles.previewCard}>
          <SkillRenderer text={skillContent} />
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomBtn} onPress={startEdit}>
          <Text style={styles.bottomBtnText}>编辑</Text>
        </Pressable>
        <Pressable
          style={[styles.bottomBtn, styles.bottomBtnPrimary]}
          onPress={handleExport}
        >
          <Text style={styles.bottomBtnTextPrimary}>导出</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── 样式 ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
    paddingBottom: 100,
  },
  errorText: {
    color: Colors.crimson,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },

  // ─── 空状态 ─────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.ink,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    color: Colors.inkMute,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    height: 56,
    backgroundColor: Colors.vermilion,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  primaryBtnText: {
    color: Colors.paper,
    fontSize: 17,
    fontWeight: '600',
  },

  // ─── 预览模式 ───────────────────────────────
  previewHeader: {
    marginBottom: 16,
  },
  previewTitle: {
    color: Colors.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: Colors.paperDark,
    borderRadius: 16,
    padding: 20,
  },

  // ─── 编辑模式 ───────────────────────────────
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  editHeaderTitle: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  editHeaderBtn: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  editHeaderSave: {
    color: Colors.vermilion,
    fontWeight: '600',
  },
  editInput: {
    flex: 1,
    padding: 20,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // ─── 底部操作栏 ─────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.paper,
    gap: 12,
  },
  bottomBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  bottomBtnText: {
    color: Colors.inkLight,
    fontSize: 15,
    fontWeight: '500',
  },
  bottomBtnPrimary: {
    backgroundColor: Colors.vermilion,
    borderColor: Colors.vermilion,
  },
  bottomBtnTextPrimary: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },
});
