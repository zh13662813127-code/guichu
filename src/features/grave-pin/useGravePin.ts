import { useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

/** 定位坐标信息 */
export interface GravePinLocation {
  latitude: number;
  longitude: number;
  /** 水平精度，单位米 */
  accuracy: number | null;
  /** 海拔高度，单位米 */
  altitude: number | null;
}

/** 定位流程状态 */
export interface GravePinState {
  status: 'idle' | 'locating' | 'success' | 'error';
  location: GravePinLocation | null;
  error: string | null;
}

/** 精度阈值：≤10 米视为高精度定位成功 */
const ACCURACY_THRESHOLD = 10;

/** 定位超时时间：10 秒 */
const TIMEOUT_MS = 10_000;

/**
 * GPS 墓址定位 Hook
 *
 * 使用流程：
 * 1. 调用 startLocating() 开始定位
 * 2. 自动请求定位权限
 * 3. 获取高精度定位（BestForNavigation）
 * 4. 精度 ≤10m 自动标记成功，超时 10s 报错
 * 5. 调用 reset() 可重置状态
 */
export function useGravePin() {
  const [state, setState] = useState<GravePinState>({
    status: 'idle',
    location: null,
    error: null,
  });

  // 用于取消超时计时器
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 清除超时计时器 */
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /** 重置状态到初始值 */
  const reset = useCallback(() => {
    clearTimer();
    setState({ status: 'idle', location: null, error: null });
  }, [clearTimer]);

  /** 开始 GPS 定位 */
  const startLocating = useCallback(async () => {
    clearTimer();
    setState({ status: 'locating', location: null, error: null });

    try {
      // 请求前台定位权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({
          status: 'error',
          location: null,
          error: '需要定位权限才能记录墓址位置，请在系统设置中开启',
        });
        return;
      }

      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('TIMEOUT'));
        }, TIMEOUT_MS);
      });

      // 获取高精度定位
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      // 竞争：定位 vs 超时
      const result = await Promise.race([locationPromise, timeoutPromise]);
      clearTimer();

      const { latitude, longitude, accuracy, altitude } = result.coords;

      const location: GravePinLocation = {
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        altitude: altitude ?? null,
      };

      // 判断精度是否达标
      if (accuracy !== null && accuracy <= ACCURACY_THRESHOLD) {
        setState({ status: 'success', location, error: null });
      } else {
        // 精度不够但仍返回结果，让用户决定是否使用
        setState({
          status: 'success',
          location,
          error: null,
        });
      }
    } catch (err) {
      clearTimer();
      const message =
        err instanceof Error && err.message === 'TIMEOUT'
          ? '定位超时，请移到开阔区域后重试'
          : '定位失败，请检查 GPS 信号后重试';

      setState({
        status: 'error',
        location: null,
        error: message,
      });
    }
  }, [clearTimer]);

  return {
    ...state,
    startLocating,
    reset,
  } as const;
}
