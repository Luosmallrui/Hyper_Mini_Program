import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.less';

export default function ErrandApplyPage() {
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });

  // 处理输入框变化
  const handleInputChange = (field: string, e: any) => {
    setFormData({
      ...formData,
      [field]: e.detail.value
    });
  };

  // 提交申请
  const handleSubmit = () => {
    // 表单验证
    if (!formData.name) {
      Taro.showToast({ title: '请输入您的姓名', icon: 'none' });
      return;
    }

    if (!formData.phone) {
      Taro.showToast({ title: '请输入您的手机号', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      Taro.showToast({ title: '手机号码格式不正确', icon: 'none' });
      return;
    }

    // 模拟API提交
    Taro.showToast({
      title: '申请提交成功',
      icon: 'success',
      duration: 1500,
      complete: () => {
        // 重置表单
        setFormData({
          name: '',
          phone: ''
        });
      }
    });
  };

  return (
    <View className="errand-container">
      {/* 页面标题 */}
      <View className="page-header">
        <Text className="title">跑腿员申请</Text>
        <Text className="subtitle">加入我们，开启灵活工作新方式</Text>
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
      </View>

      {/* 提交按钮 */}
      <Button className="submit-btn" onClick={handleSubmit}>
        提交申请
      </Button>

      {/* 底部说明 */}
      <View className="footer">
        <Text className="footer-text">提交申请后，我们将在1-3个工作日内联系您</Text>
        <Text className="footer-text">客服热线：400-123-4567</Text>
      </View>
    </View>
  );
}
