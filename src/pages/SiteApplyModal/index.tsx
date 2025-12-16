import { View, Text, Input, Button, Picker, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.less';

export default function StationApplyPage() {
  // 表单数据状态
  const [formData, setFormData] = useState({
    siteName: '',
    phone: '',
    city: '', // 选择的市
    address: '', // 选择的地址
    detailAddress: '' // 详细地址
  });

  // 选择器可见状态
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  // 模拟城市数据
  const cityOptions = [
    '北京市',
    '上海市',
    '广州市',
    '深圳市',
    '杭州市',
    '南京市',
    '武汉市',
    '成都市',
    '重庆市',
    '天津市',
    '苏州市',
    '西安市'
  ];

  // 处理输入框变化
  const handleInputChange = (field: string, e: any) => {
    setFormData({
      ...formData,
      [field]: e.detail.value
    });
  };

  // 处理城市选择变化
  const handleCityChange = (e: any) => {
    const value = e.detail.value;
    setFormData({
      ...formData,
      city: cityOptions[value]
    });
    setCityPickerVisible(false);
  };

  // 打开地图选择位置
  const handleOpenMap = () => {
    Taro.chooseLocation({
      success: (res) => {
        if (res.address) {
          setFormData({
            ...formData,
            address: res.address,
            detailAddress: res.name || ''
          });
        }
      },
      fail: () => {
        Taro.showToast({ title: '定位失败，请重试', icon: 'none' });
      }
    });
  };

  // 提交申请
  const handleSubmit = () => {
    // 表单验证
    if (!formData.siteName) {
      Taro.showToast({ title: '请输入站点名称', icon: 'none' });
      return;
    }

    if (!formData.phone) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      Taro.showToast({ title: '手机号码格式不正确', icon: 'none' });
      return;
    }

    if (!formData.city) {
      Taro.showToast({ title: '请选择城市', icon: 'none' });
      return;
    }

    if (!formData.address) {
      Taro.showToast({ title: '请选择地址', icon: 'none' });
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
          siteName: '',
          phone: '',
          city: '',
          address: '',
          detailAddress: ''
        });
      }
    });
  };

  return (
    <View className='station-container'>
      {/* 页面标题 */}
      <View className='page-header'>
        <Text className='title'>站点申请</Text>
        <Text className='subtitle'>填写站点信息，加入我们的服务网络</Text>
      </View>

      {/* 表单区域 */}
      <View className='form-container'>
        {/* 站点名称 */}
        <View className='form-item'>
          <Text className='label'>站点名称</Text>
          <Input
            className='input'
            placeholder='请输入您的站点名称'
            placeholderClass='placeholder'
            value={formData.siteName}
            onInput={(e) => handleInputChange('siteName', e)}
          />
        </View>

        {/* 手机号 */}
        <View className='form-item'>
          <Text className='label'>手机号</Text>
          <Input
            className='input'
            placeholder='请输入您的手机号'
            placeholderClass='placeholder'
            type='number'
            maxlength={11}
            value={formData.phone}
            onInput={(e) => handleInputChange('phone', e)}
          />
        </View>

        {/* 城市选择 */}
        <View
          className='form-item'
          onClick={() => setCityPickerVisible(true)}
        >
          <Text className='label'>小区</Text>
          <View className='input'>
            <Text className={formData.city ? '' : 'placeholder'}>
              {formData.city || '请选择您所在的城市'}
            </Text>
          </View>
        </View>

        {/* 地址选择 */}
        <View
          className='form-item'
          onClick={handleOpenMap}
        >
          <Text className='label'>地址</Text>
          <View className='input'>
            <Text className={formData.address ? '' : 'placeholder'}>
              {formData.address || '请选择您的地址'}
            </Text>
          </View>
        </View>

        {/* 详细地址 */}
        <View className='form-item'>
          <Text className='label'>详细地址</Text>
          <Textarea
            className='textarea'
            placeholder='请补充详细地址信息（楼栋、门牌号等）'
            placeholderClass='placeholder'
            value={formData.detailAddress}
            onInput={(e) => handleInputChange('detailAddress', e)}
            autoHeight
          />
        </View>
      </View>

      {/* 地图定位提示 */}
      <View className='map-tip'>
        <Text className='tip-text'>点击"地址"栏打开地图，选择您的准确位置</Text>
      </View>

      {/* 提交按钮 */}
      <Button className='submit-btn' onClick={handleSubmit}>
        提交申请
      </Button>

      {/* 城市选择器 */}
      {cityPickerVisible && (
        <Picker
          mode='selector'
          range={cityOptions}
          onChange={handleCityChange}
          onCancel={() => setCityPickerVisible(false)}
        >
          <View className='picker-mask' onClick={() => setCityPickerVisible(false)} />
        </Picker>
      )}

      {/* 底部说明 */}
      <View className='footer'>
        <Text className='footer-text'>提交申请后，我们将在1-3个工作日内联系您</Text>
        <Text className='footer-text'>客服热线：400-123-4567</Text>
      </View>
    </View>
  );
}
