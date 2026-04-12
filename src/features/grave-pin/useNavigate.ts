import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** 支持的第三方地图应用 */
export type MapApp = 'apple' | 'amap' | 'baidu' | 'google';

interface NavigateParams {
  latitude: number;
  longitude: number;
  /** 目的地名称，用于地图标注 */
  name?: string;
  /** 优先使用的地图应用，默认按平台选择 */
  preferredApp?: MapApp;
}

/**
 * 构建各地图应用的导航 URL
 */
function buildMapUrl(app: MapApp, params: NavigateParams): string {
  const { latitude, longitude, name } = params;
  const label = encodeURIComponent(name ?? '墓址位置');

  switch (app) {
    case 'apple':
      // Apple Maps URL scheme
      return `maps://app?daddr=${latitude},${longitude}&dirflg=d&t=m&q=${label}`;

    case 'amap':
      // 高德地图
      if (Platform.OS === 'ios') {
        return `iosamap://path?sourceApplication=guichu&dlat=${latitude}&dlon=${longitude}&dname=${label}&dev=0&t=0`;
      }
      return `androidamap://route?sourceApplication=guichu&dlat=${latitude}&dlon=${longitude}&dname=${label}&dev=0&t=0`;

    case 'baidu':
      // 百度地图
      return `baidumap://map/direction?destination=${latitude},${longitude}&coord_type=wgs84&mode=driving&src=guichu`;

    case 'google':
      // Google Maps，使用 https 确保跨平台兼容
      return `https://maps.google.com/maps?daddr=${latitude},${longitude}&q=${label}`;
  }
}

/**
 * 获取当前平台的默认地图应用
 */
function getDefaultApp(): MapApp {
  return Platform.OS === 'ios' ? 'apple' : 'google';
}

/**
 * 调起第三方地图应用进行导航
 *
 * @param params 导航参数
 * @returns 是否成功打开地图应用
 *
 * @example
 * ```ts
 * const success = await navigateToLocation({
 *   latitude: 30.274,
 *   longitude: 120.155,
 *   name: '外公墓地',
 *   preferredApp: 'amap',
 * });
 * ```
 */
export async function navigateToLocation(
  params: NavigateParams
): Promise<boolean> {
  const app = params.preferredApp ?? getDefaultApp();
  const url = buildMapUrl(app, params);

  try {
    // 检查是否能打开该 URL scheme
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      // 回退到 Google Maps 网页版（始终可用）
      if (app !== 'google') {
        const fallbackUrl = buildMapUrl('google', params);
        await Linking.openURL(fallbackUrl);
        return true;
      }
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
