import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';

interface PrimaryButtonProps {
  /** 按钮文字 */
  title: string;
  /** 点击回调 */
  onPress: (event: GestureResponderEvent) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 左侧图标（ReactNode） */
  icon?: React.ReactNode;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 自定义外层样式 */
  style?: ViewStyle;
}

/**
 * 设计系统主按钮
 *
 * - 胶囊形，高度 56pt
 * - 朱砂红背景，按压态加深
 * - 按压时缩放 0.96 + 触觉反馈
 */
export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  icon,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  /** 按下：缩放 + 触觉反馈 */
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [scaleAnim]);

  /** 松开：恢复缩放 */
  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const isDisabled = disabled || loading;

  return (
    <Animated.View
      style={[{ transform: [{ scale: scaleAnim }] }, style]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          pressed && !isDisabled && styles.buttonPressed,
          isDisabled && styles.buttonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.paper} size="small" />
        ) : (
          <>
            {icon && <>{icon}</>}
            <Text
              style={[
                styles.text,
                icon != null && styles.textWithIcon,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    backgroundColor: Colors.vermilion,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  buttonPressed: {
    backgroundColor: Colors.vermilionPressed,
  },
  buttonDisabled: {
    backgroundColor: Colors.inkMute,
  },
  text: {
    color: Colors.paper,
    fontSize: 17,
    fontWeight: '600',
  },
  textWithIcon: {
    marginLeft: 8,
  },
});
