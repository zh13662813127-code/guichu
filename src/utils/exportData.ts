/**
 * 数据导入导出工具
 * 导出：Web 端 Blob 下载，Native 端 expo-sharing 分享
 * 导入：Web 端 file input 选择，Native 端 expo-document-picker 选择
 */

import { Platform } from 'react-native';

/**
 * 导出长辈数据为 JSON 文件
 * @param ancestors - 长辈列表数据
 */
export async function exportAncestorsData(ancestors: any[]): Promise<void> {
  const data = {
    version: '0.1.0',
    exported_at: new Date().toISOString(),
    ancestors,
  };
  const json = JSON.stringify(data, null, 2);

  if (Platform.OS === 'web') {
    // Web 端：Blob + 虚拟 <a> 标签触发下载
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guichu_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // Native 端：写入临时文件后用系统分享面板导出
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const path = `${FileSystem.documentDirectory}guichu_backup.json`;
    await FileSystem.writeAsStringAsync(path, json);
    await Sharing.shareAsync(path);
  }
}

/**
 * 从 JSON 文件导入长辈数据
 * @param addAncestor - 添加长辈的函数（来自 ancestorStore）
 * @returns 成功导入的数量
 */
export async function importAncestorsData(
  addAncestor: (data: {
    name: string;
    relationship?: string;
    gender?: string;
    birthYear?: number;
    deathYear?: number;
    deathDate?: string;
    honor?: string;
  }) => Promise<string>,
): Promise<number> {
  let json: string;

  if (Platform.OS === 'web') {
    // Web 端：创建隐藏 file input 选择 JSON 文件
    json = await new Promise<string>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('未选择文件'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
      };
      // 用户取消选择
      input.oncancel = () => reject(new Error('已取消选择'));
      input.click();
    });
  } else {
    // Native 端：用 expo-document-picker 选择文件
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = await import('expo-file-system');

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('已取消选择');
    }

    const fileUri = result.assets[0].uri;
    json = await FileSystem.readAsStringAsync(fileUri);
  }

  // 解析 JSON
  let data: any;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('文件格式错误，不是有效的 JSON');
  }

  // 校验结构：需要有 ancestors 数组
  const ancestors = data.ancestors;
  if (!Array.isArray(ancestors) || ancestors.length === 0) {
    throw new Error('数据格式不正确，未找到长辈记录');
  }

  // 逐条导入
  let count = 0;
  for (const item of ancestors) {
    // 校验必须有 name 字段
    if (!item.name || typeof item.name !== 'string') {
      continue;
    }
    try {
      await addAncestor({
        name: item.name,
        relationship: item.relationship ?? undefined,
        gender: item.gender ?? undefined,
        birthYear: item.birth_year ?? undefined,
        deathYear: item.death_year ?? undefined,
        deathDate: item.death_date ?? undefined,
        honor: item.honor ?? undefined,
      });
      count++;
    } catch (e) {
      console.warn(`导入长辈「${item.name}」失败:`, e);
    }
  }

  return count;
}
