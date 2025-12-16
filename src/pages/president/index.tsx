import { View, Text, Input, Button, Picker, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.less';

export default function PresidentApplyPage() {
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    referralCode: '',
    region: ['', '', ''],
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

  // 处理地区选择变化 - 修复区域选择问题
  const handleRegionChange = (e: any) => {
    const value = e.detail.value;
    setFormData({
      ...formData,
      region: value
    });
    // 这里不需要立即关闭选择器，等用户点击确定
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
      return `${formData.region[0]}/${formData.region[1]}/${formData.region[2]}`;
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

    // 提交逻辑 - 实际应用中应调用API
    Taro.showToast({
      title: '提交成功',
      icon: 'success',
      duration: 1500,
      complete: () => {
        // 重置表单
        setFormData({
          name: '',
          phone: '',
          referralCode: '',
          region: ['', '', ''],
          remark: ''
        });

        // 返回上一页或跳转到结果页
        Taro.navigateBack();
      }
    });
  };

  return (
    <View className='president-container'>
      <View className='form-container'>
        {/* 姓名 */}
        <View className='form-item'>
          <Text className='label'>姓名</Text>
          <Input
            className='input'
            placeholder='请输入您的真实姓名'
            value={formData.name}
            onInput={(e) => handleInputChange('name', e)}
          />
        </View>

        {/* 手机号 */}
        <View className='form-item'>
          <Text className='label'>手机</Text>
          <Input
            className='input'
            placeholder='请输入您的手机号码'
            type='number'
            maxlength={11}
            value={formData.phone}
            onInput={(e) => handleInputChange('phone', e)}
          />
        </View>

        {/* 推广码 */}
        <View className='form-item'>
          <Text className='label'>推广码</Text>
          <Input
            className='input'
            placeholder='请输入推广码'
            value={formData.referralCode}
            onInput={(e) => handleInputChange('referralCode', e)}
          />
        </View>

        {/* 区域选择 - 修复点击问题 */}
        <View
          className='form-item'
          onClick={() => setRegionPickerVisible(true)}
        >
          <Text className='label'>区域</Text>
          <View className='input'>
            <Text className={formData.region[0] ? '' : 'placeholder'}>
              {getRegionText()}
            </Text>
          </View>
        </View>

        {/* 备注 */}
        <View className='form-item'>
          <Text className='label'>备注</Text>
          <Textarea
            className='textarea'
            placeholder='备注'
            value={formData.remark}
            onInput={(e) => handleInputChange('remark', e)}
            autoHeight
          />
        </View>
      </View>

      {/* 提交按钮 */}
      <Button className='submit-btn' onClick={handleSubmit}>
        提交申请
      </Button>

      {/* 地区选择器 - 修复区域选择问题 */}
      {regionPickerVisible && (
        <View className='picker-container'>
          <Picker
            mode='region'
            value={formData.region}
            onChange={handleRegionChange}
          >
            <View className='picker-inner'>
              <View className='picker-header'>
                <Text className='picker-cancel' onClick={handleRegionCancel}>取消</Text>
                <Text className='picker-title'>选择区域</Text>
                <Text className='picker-confirm' onClick={handleRegionConfirm}>确定</Text>
              </View>
              <View className='picker-body'>
                {/* Picker内容由小程序原生渲染 */}
              </View>
            </View>
          </Picker>
        </View>
      )}

      {/* 蒙层 */}
      {regionPickerVisible && (
        <View className='mask' onClick={handleRegionCancel} />
      )}
    </View>
  );
}
