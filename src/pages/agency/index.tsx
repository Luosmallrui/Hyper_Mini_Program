import { View, Text, Input, Button, Picker, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.less';

export default function PresidentApplyPage() {
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    region: ['', '', ''], // [省, 市, 区]
    remark: ''
  });

  // 地区选择器可见状态
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);

  // 处理输入框变化
  const handleInputChange = (field: string, e: any) => {
    setFormData({
      ...formData,
      [field]: e.detail.value
    });
  };

  // 处理地区选择变化
  const handleRegionChange = (e: any) => {
    const value = e.detail.value;
    setFormData({
      ...formData,
      region: value
    });
  };

  // 关闭选择器并应用选择
  const handleRegionConfirm = () => {
    setRegionPickerVisible(false);
  };

  // 关闭选择器并取消选择
  const handleRegionCancel = () => {
    setRegionPickerVisible(false);
  };

  // 获取区域显示文本
  const getRegionText = () => {
    if (formData.region[0]) {
      return `${formData.region[0]} ${formData.region[1]} ${formData.region[2]}`;
    }
    return '选择区域';
  };

  // 提交申请
  const handleSubmit = () => {
    // 表单验证
    if (!formData.name) {
      Taro.showToast({ title: '请输入您的真实姓名', icon: 'none' });
      return;
    }

    if (!formData.phone) {
      Taro.showToast({ title: '请输入您的手机号码', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      Taro.showToast({ title: '手机号码格式不正确', icon: 'none' });
      return;
    }

    if (!formData.region[0] || !formData.region[1] || !formData.region[2]) {
      Taro.showToast({ title: '请选择区域', icon: 'none' });
      return;
    }

    // 模拟API提交
    Taro.showToast({
      title: '代理申请提交成功',
      icon: 'success',
      duration: 1500,
      complete: () => {
        // 重置表单
        setFormData({
          name: '',
          phone: '',
          region: ['', '', ''],
          remark: ''
        });
      }
    });
  };

  return (
    <View className="president-container">
      {/* 页面标题 */}
      <View className="page-header">
        <Text className="title">代理申请</Text>
        <Text className="subtitle">加入我们，开启创业新篇章</Text>
      </View>

      {/* 表单区域 */}
      <View className="form-container">
        {/* 姓名输入 */}
        <View className="form-item">
          <Text className="label">姓名</Text>
          <Input
            className="input"
            placeholder="请输入您的姓名"
            placeholderClass="placeholder"
            value={formData.name}
            onInput={(e) => handleInputChange('name', e)}
          />
        </View>

        {/* 手机号输入 */}
        <View className="form-item">
          <Text className="label">手机号</Text>
          <Input
            className="input"
            placeholder="请输入您的手机号"
            placeholderClass="placeholder"
            type="number"
            maxlength={11}
            value={formData.phone}
            onInput={(e) => handleInputChange('phone', e)}
          />
        </View>

        {/* 区域选择 */}
        <View
          className="form-item"
          onClick={() => setRegionPickerVisible(true)}
        >
          <Text className="label">区域</Text>
          <View className="input">
            <Text className={formData.region[0] ? '' : 'placeholder'}>
              {getRegionText()}
            </Text>
          </View>
        </View>

        {/* 备注 */}
        <View className="form-item">
          <Text className="label">备注</Text>
          <Textarea
            className="textarea"
            placeholder="备注信息（选填）"
            placeholderClass="placeholder"
            value={formData.remark}
            onInput={(e) => handleInputChange('remark', e)}
            autoHeight
          />
        </View>
      </View>

      {/* 提交按钮 */}
      <Button className="submit-btn" onClick={handleSubmit}>
        提交申请
      </Button>

      {/* 地区选择器 */}
      {regionPickerVisible && (
        <View className="picker-container">
          <Picker
            mode="region"
            value={formData.region}
            onChange={handleRegionChange}
          >
            <View className="picker-inner">
              <View className="picker-header">
                <Text className="picker-cancel" onClick={handleRegionCancel}>取消</Text>
                <Text className="picker-title">选择区域</Text>
                <Text className="picker-confirm" onClick={handleRegionConfirm}>确定</Text>
              </View>
            </View>
          </Picker>
        </View>
      )}

      {/* 蒙层 */}
      {regionPickerVisible && (
        <View className="mask" onClick={handleRegionCancel} />
      )}

      {/* 底部说明 */}
      <View className="footer">
        <Text className="footer-text">提交申请后，我们将在1-3个工作日内联系您</Text>
        <Text className="footer-text">客服热线：400-123-4567</Text>
      </View>
    </View>
  );
}
