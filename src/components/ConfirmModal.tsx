/**
 * 通用确认弹窗组件
 * 替代 Alert.alert，解决 Web 端不工作的问题
 * 半透明遮罩 + 居中白色弹窗 + 标题 + 内容 + 两个按钮
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { Colors } from '../constants/colors';

interface ConfirmModalProps {
  /** 是否显示 */
  visible: boolean;
  /** 弹窗标题 */
  title: string;
  /** 弹窗内容描述 */
  message?: string;
  /** 确认按钮文案，默认"确定" */
  confirmLabel?: string;
  /** 取消按钮文案，默认"取消" */
  cancelLabel?: string;
  /** 为 true 时确认按钮变红（用于删除等危险操作） */
  destructive?: boolean;
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        {/* 阻止内部点击穿透关闭弹窗 */}
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonRow}>
            {/* 取消按钮 */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            {/* 确认按钮 */}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
                pressed && (destructive ? styles.destructiveButtonPressed : styles.confirmButtonPressed),
              ]}
              onPress={onConfirm}
            >
              <Text
                style={destructive ? styles.destructiveText : styles.confirmText}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /** 半透明遮罩 */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  /** 居中白色弹窗 */
  dialog: {
    backgroundColor: Colors.paper,
    borderRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: Colors.inkLight,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  /** 取消按钮 — 浅灰底色 */
  cancelButton: {
    backgroundColor: Colors.paperDark,
  },
  cancelButtonPressed: {
    backgroundColor: Colors.divider,
  },
  cancelText: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  /** 普通确认按钮 — 朱砂红 */
  confirmButton: {
    backgroundColor: Colors.vermilion,
  },
  confirmButtonPressed: {
    backgroundColor: Colors.vermilionPressed,
  },
  confirmText: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },
  /** 危险确认按钮 — 绛红 */
  destructiveButton: {
    backgroundColor: Colors.crimson,
  },
  destructiveButtonPressed: {
    backgroundColor: '#6B1616',
  },
  destructiveText: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },
});
