/**
 * 我的地区（习俗查询）页
 * 调用 LLM 查询当地祭祖习俗，流式显示结果
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { ConfirmModal } from '../../src/components/ConfirmModal';

const isNative = Platform.OS !== 'web';

// ─── 省份数据 ──────────────────────────────────────────

const PROVINCES = [
  '北京市', '天津市', '上海市', '重庆市',
  '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省',
  '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省',
  '海南省', '四川省', '贵州省', '云南省', '陕西省',
  '甘肃省', '青海省', '台湾省',
  '内蒙古自治区', '广西壮族自治区', '西藏自治区',
  '宁夏回族自治区', '新疆维吾尔自治区',
  '香港特别行政区', '澳门特别行政区',
];

// ─── 城市数据（主要城市） ──────────────────────────────

const CITIES: Record<string, string[]> = {
  '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '通州区', '大兴区', '昌平区'],
  '天津市': ['和平区', '河东区', '河西区', '南开区', '河北区', '滨海新区', '武清区', '宝坻区'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '浦东新区', '闵行区', '宝山区', '松江区'],
  '重庆市': ['渝中区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '渝北区', '万州区'],
  '河北省': ['石家庄市', '唐山市', '秦皇岛市', '邯郸市', '保定市', '张家口市', '承德市', '沧州市', '廊坊市', '衡水市'],
  '山西省': ['太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '运城市', '临汾市'],
  '辽宁省': ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市'],
  '吉林省': ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市'],
  '黑龙江省': ['哈尔滨市', '齐齐哈尔市', '牡丹江市', '佳木斯市', '大庆市', '绥化市', '鸡西市', '双鸭山市'],
  '江苏省': ['南京市', '苏州市', '无锡市', '常州市', '南通市', '扬州市', '徐州市', '盐城市', '淮安市', '镇江市'],
  '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '台州市'],
  '安徽省': ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '安庆市', '黄山市', '阜阳市'],
  '福建省': ['福州市', '厦门市', '泉州市', '漳州市', '莆田市', '龙岩市', '三明市', '南平市'],
  '江西省': ['南昌市', '景德镇市', '萍乡市', '九江市', '赣州市', '吉安市', '宜春市', '上饶市'],
  '山东省': ['济南市', '青岛市', '烟台市', '潍坊市', '济宁市', '泰安市', '威海市', '临沂市', '德州市', '聊城市'],
  '河南省': ['郑州市', '洛阳市', '开封市', '南阳市', '安阳市', '新乡市', '许昌市', '周口市', '商丘市', '信阳市'],
  '湖北省': ['武汉市', '宜昌市', '襄阳市', '荆州市', '黄冈市', '十堰市', '孝感市', '荆门市'],
  '湖南省': ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市'],
  '广东省': ['广州市', '深圳市', '珠海市', '汕头市', '佛山市', '东莞市', '中山市', '惠州市', '湛江市', '茂名市'],
  '海南省': ['海口市', '三亚市', '琼海市', '儋州市', '万宁市', '文昌市'],
  '四川省': ['成都市', '绵阳市', '德阳市', '宜宾市', '南充市', '自贡市', '泸州市', '乐山市', '达州市'],
  '贵州省': ['贵阳市', '遵义市', '六盘水市', '安顺市', '毕节市', '铜仁市', '黔南州', '黔东南州'],
  '云南省': ['昆明市', '曲靖市', '玉溪市', '大理市', '红河州', '楚雄州', '文山州', '丽江市'],
  '陕西省': ['西安市', '咸阳市', '宝鸡市', '渭南市', '汉中市', '榆林市', '延安市', '安康市'],
  '甘肃省': ['兰州市', '天水市', '白银市', '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市'],
  '青海省': ['西宁市', '海东市', '海西州', '海南州', '海北州', '黄南州'],
  '台湾省': ['台北市', '高雄市', '台中市', '台南市', '新北市', '桃园市'],
  '内蒙古自治区': ['呼和浩特市', '包头市', '赤峰市', '鄂尔多斯市', '呼伦贝尔市', '通辽市', '乌兰察布市'],
  '广西壮族自治区': ['南宁市', '柳州市', '桂林市', '梧州市', '北海市', '玉林市', '钦州市', '百色市'],
  '西藏自治区': ['拉萨市', '日喀则市', '昌都市', '林芝市', '山南市', '那曲市'],
  '宁夏回族自治区': ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
  '新疆维吾尔自治区': ['乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市', '喀什市', '阿克苏市', '伊宁市'],
  '香港特别行政区': ['香港岛', '九龙', '新界'],
  '澳门特别行政区': ['澳门半岛', '氹仔', '路环'],
};

// ─── 存储工具 ──────────────────────────────────────────

/** 读取 LLM 配置 */
async function loadLLMConfig(): Promise<{
  baseURL: string;
  apiKey: string;
  model: string;
} | null> {
  try {
    if (isNative) {
      const SecureStore = await import('expo-secure-store');
      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();
      const apiKey = (await SecureStore.getItemAsync('llm_api_key')) || '';
      if (!apiKey) return null;
      return {
        baseURL: storage.getString('llm_base_url') || 'https://api.deepseek.com/v1',
        apiKey,
        model: storage.getString('llm_model') || 'deepseek-chat',
      };
    } else {
      const apiKey = localStorage.getItem('llm_api_key') || '';
      if (!apiKey) return null;
      return {
        baseURL: localStorage.getItem('llm_base_url') || 'https://api.deepseek.com/v1',
        apiKey,
        model: localStorage.getItem('llm_model') || 'deepseek-chat',
      };
    }
  } catch {
    return null;
  }
}

/** 保存查询结果到本地 */
async function saveCustomsResult(province: string, city: string, detail: string, result: string) {
  const key = 'region_customs_result';
  const data = JSON.stringify({ province, city, detail, result, savedAt: new Date().toISOString() });
  if (isNative) {
    try {
      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();
      storage.set(key, data);
    } catch { /* 忽略 */ }
  } else {
    localStorage.setItem(key, data);
  }
}

/** 读取已保存的查询结果 */
async function loadCustomsResult(): Promise<{
  province: string; city: string; detail: string; result: string; savedAt: string;
} | null> {
  const key = 'region_customs_result';
  try {
    let raw: string | undefined;
    if (isNative) {
      const { MMKV } = await import('react-native-mmkv');
      const storage = new MMKV();
      raw = storage.getString(key);
    } else {
      raw = localStorage.getItem(key) || undefined;
    }
    if (raw) return JSON.parse(raw);
  } catch { /* 忽略 */ }
  return null;
}

// ─── 主组件 ───────────────────────────────────────────────

export default function RegionScreen() {
  const router = useRouter();

  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [detail, setDetail] = useState('');
  const [result, setResult] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 弹窗状态
  const [provinceModal, setProvinceModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [noLLMModal, setNoLLMModal] = useState(false);
  const [savedModal, setSavedModal] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // 加载已保存结果
  useEffect(() => {
    loadCustomsResult().then((saved) => {
      if (saved) {
        setProvince(saved.province);
        setCity(saved.city);
        setDetail(saved.detail);
        setResult(saved.result);
      }
      setIsLoading(false);
    });
  }, []);

  /** 选省后清空城市 */
  const handleSelectProvince = useCallback((p: string) => {
    setProvince(p);
    setCity('');
    setProvinceModal(false);
  }, []);

  /** 选城市 */
  const handleSelectCity = useCallback((c: string) => {
    setCity(c);
    setCityModal(false);
  }, []);

  /** 点击查询 — 先弹确认 */
  const handleQueryPress = useCallback(async () => {
    if (!province) return;
    // 检查 LLM 配置
    const llm = await loadLLMConfig();
    if (!llm) {
      setNoLLMModal(true);
      return;
    }
    setConfirmModal(true);
  }, [province]);

  /** 确认查询 — 调用 LLM */
  const handleConfirmQuery = useCallback(async () => {
    setConfirmModal(false);
    setIsQuerying(true);
    setResult('');

    const locationStr = `${province}${city}${detail}`;
    const systemPrompt = '你是一个中国民俗专家。请详细介绍用户指定地区的祭祖习俗。用通俗易懂的语言，像长辈教晚辈一样说。';
    const userPrompt = `请详细介绍「${locationStr}」地区的祭祖习俗，包括：
1. 清明节习俗（扫墓流程、需要带什么）
2. 中元节（七月半）习俗
3. 寒衣节习俗
4. 除夕祭祖习俗
5. 丧事后的重要日子（头七、百日、周年、三周年）
6. 春联颜色规则（去世第一年/第二年/第三年）
7. 其他地方特色习俗

请用通俗易懂的语言，像长辈教晚辈一样说。`;

    try {
      const llmConfig = await loadLLMConfig();
      if (!llmConfig) return;

      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({
        baseURL: llmConfig.baseURL,
        apiKey: llmConfig.apiKey,
        dangerouslyAllowBrowser: true,
      });

      // 流式请求
      const stream = await client.chat.completions.create({
        model: llmConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        stream: true,
      });

      let accumulated = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          accumulated += delta;
          setResult(accumulated);
        }
      }
    } catch (e: any) {
      console.error('LLM 查询失败:', e);
      setResult(`查询失败：${e?.message || '未知错误'}\n\n请检查 LLM 配置是否正确。`);
    } finally {
      setIsQuerying(false);
    }
  }, [province, city, detail]);

  /** 保存到本地 */
  const handleSave = useCallback(async () => {
    await saveCustomsResult(province, city, detail, result);
    setSavedModal(true);
  }, [province, city, detail, result]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={Colors.vermilion} />
        </View>
      </SafeAreaView>
    );
  }

  const cityList = CITIES[province] || [];

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* 省份选择 */}
        <Text style={s.label}>省份</Text>
        <Pressable
          style={({ pressed }) => [s.picker, pressed && { opacity: 0.7 }]}
          onPress={() => setProvinceModal(true)}
        >
          <Text style={province ? s.pickerText : s.pickerPlaceholder}>
            {province || '请选择'}
          </Text>
          <Text style={s.pickerArrow}>{'\u25BC'}</Text>
        </Pressable>

        {/* 城市选择 */}
        <Text style={s.label}>城市</Text>
        <Pressable
          style={({ pressed }) => [s.picker, pressed && { opacity: 0.7 }, !province && s.pickerDisabled]}
          onPress={() => province && setCityModal(true)}
          disabled={!province}
        >
          <Text style={city ? s.pickerText : s.pickerPlaceholder}>
            {city || '请选择'}
          </Text>
          <Text style={s.pickerArrow}>{'\u25BC'}</Text>
        </Pressable>

        {/* 详细地址 */}
        <Text style={s.label}>详细地址（可选）</Text>
        <TextInput
          style={s.input}
          value={detail}
          onChangeText={setDetail}
          placeholder="如：XX镇XX村"
          placeholderTextColor={Colors.inkMute}
        />

        {/* 查询按钮 */}
        <Pressable
          style={({ pressed }) => [
            s.queryBtn,
            (!province || isQuerying) && s.queryBtnDisabled,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleQueryPress}
          disabled={!province || isQuerying}
        >
          {isQuerying ? (
            <ActivityIndicator color={Colors.paper} size="small" />
          ) : (
            <Text style={s.queryBtnText}>查询当地祭祖习俗</Text>
          )}
        </Pressable>

        {/* 查询结果 */}
        {(result || isQuerying) && (
          <View style={s.resultCard}>
            <Text style={s.resultTitle}>查询结果</Text>
            <Text style={s.resultText} selectable>
              {result || '正在查询中...'}
            </Text>
            {isQuerying && (
              <ActivityIndicator color={Colors.vermilion} style={{ marginTop: 12 }} />
            )}
          </View>
        )}

        {/* 保存按钮 */}
        {result && !isQuerying && (
          <Pressable
            style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.8 }]}
            onPress={handleSave}
          >
            <Text style={s.saveBtnText}>保存到本地</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ─── 省份选择弹窗 ─── */}
      <Modal visible={provinceModal} transparent animationType="slide" onRequestClose={() => setProvinceModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.listModal}>
            <View style={s.listModalHeader}>
              <Text style={s.listModalTitle}>选择省份</Text>
              <Pressable onPress={() => setProvinceModal(false)}>
                <Text style={s.listModalClose}>关闭</Text>
              </Pressable>
            </View>
            <FlatList
              data={PROVINCES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    s.listItem,
                    item === province && s.listItemActive,
                    pressed && { backgroundColor: Colors.paperDark },
                  ]}
                  onPress={() => handleSelectProvince(item)}
                >
                  <Text style={[s.listItemText, item === province && s.listItemTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ─── 城市选择弹窗 ─── */}
      <Modal visible={cityModal} transparent animationType="slide" onRequestClose={() => setCityModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.listModal}>
            <View style={s.listModalHeader}>
              <Text style={s.listModalTitle}>选择城市</Text>
              <Pressable onPress={() => setCityModal(false)}>
                <Text style={s.listModalClose}>关闭</Text>
              </Pressable>
            </View>
            <FlatList
              data={cityList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    s.listItem,
                    item === city && s.listItemActive,
                    pressed && { backgroundColor: Colors.paperDark },
                  ]}
                  onPress={() => handleSelectCity(item)}
                >
                  <Text style={[s.listItemText, item === city && s.listItemTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={s.emptyHint}>暂无城市数据</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ─── 查询确认弹窗 ─── */}
      <ConfirmModal
        visible={confirmModal}
        title="查询当地习俗"
        message={`将调用你配置的大模型 API 查询「${province}${city}」的祭祖习俗。\n这会消耗少量 API 额度（约 2000 tokens）。\n确认查询吗？`}
        confirmLabel="确认查询"
        onConfirm={handleConfirmQuery}
        onCancel={() => setConfirmModal(false)}
      />

      {/* ─── 未配置 LLM 弹窗 ─── */}
      <ConfirmModal
        visible={noLLMModal}
        title="未配置 LLM"
        message="你还没有配置大模型 API Key。\n请先到「设置 → LLM 配置」页完成配置。"
        confirmLabel="去配置"
        onConfirm={() => { setNoLLMModal(false); router.push('/settings/llm' as any); }}
        onCancel={() => setNoLLMModal(false)}
      />

      {/* ─── 保存成功弹窗 ─── */}
      <ConfirmModal
        visible={savedModal}
        title="已保存"
        message="习俗查询结果已保存到本地。"
        confirmLabel="好的"
        onConfirm={() => setSavedModal(false)}
        onCancel={() => setSavedModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── 样式 ──────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 60 },

  label: {
    color: Colors.inkLight,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },

  // ─── Picker ───────────────────────────────
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
  },
  pickerDisabled: { opacity: 0.5 },
  pickerText: { color: Colors.ink, fontSize: 15 },
  pickerPlaceholder: { color: Colors.inkMute, fontSize: 15 },
  pickerArrow: { color: Colors.inkMute, fontSize: 12 },

  // ─── Input ───────────────────────────────
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    fontSize: 15,
    color: Colors.ink,
  },

  // ─── 查询按钮 ───────────────────────────────
  queryBtn: {
    height: 52,
    backgroundColor: Colors.vermilion,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  queryBtnDisabled: { opacity: 0.5 },
  queryBtnText: {
    color: Colors.paper,
    fontSize: 16,
    fontWeight: '600',
  },

  // ─── 结果 ───────────────────────────────
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    marginTop: 20,
  },
  resultTitle: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultText: {
    color: Colors.inkLight,
    fontSize: 14,
    lineHeight: 24,
  },

  // ─── 保存按钮 ───────────────────────────────
  saveBtn: {
    height: 50,
    backgroundColor: Colors.jade,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: Colors.paper,
    fontSize: 15,
    fontWeight: '600',
  },

  // ─── Modal 列表 ───────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  listModal: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  listModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  listModalTitle: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  listModalClose: {
    color: Colors.vermilion,
    fontSize: 15,
    fontWeight: '500',
  },
  listItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  listItemActive: {
    backgroundColor: Colors.vermilion + '10',
  },
  listItemText: {
    color: Colors.ink,
    fontSize: 15,
  },
  listItemTextActive: {
    color: Colors.vermilion,
    fontWeight: '600',
  },
  emptyHint: {
    color: Colors.inkMute,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
