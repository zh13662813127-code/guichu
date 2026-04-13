/**
 * 数据导出工具
 * 支持 Web 端 Blob 下载 和 Native 端 expo-sharing 分享
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
