import { View, Text, Input, Textarea, Image, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.less';

export default function AddressEditPage() {
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    region: ['', '', ''],
    address: '',
    isDefault: false
  });

  // 选择的图片
  const [images, setImages] = useState<string[]>([]);

  // 地区选择器显示状态
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);

  // 处理输入变化
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
    setRegionPickerVisible(false);
  };

  // 切换默认地址状态
  const toggleDefault = () => {
    setFormData({
      ...formData,
      isDefault: !formData.isDefault
    });
  };

  // 上传图片
  const uploadImage = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        setImages([...images, ...tempFilePaths]);
      }
    });
  };

  // 删除图片
  const deleteImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // 粘贴文本自动识别
  const pasteAndRecognize = () => {
    Taro.getClipboardData({
      success: (res) => {
        const text = res.data;
        // 这里简化处理，实际应用中应调用识别API
        Taro.showModal({
          title: '识别结果',
          content: `已识别文本: ${text}`,
          showCancel: false
        });
      }
    });
  };

  // 保存地址
  const saveAddress = () => {
    if (!formData.name) {
      Taro.showToast({ title: '请填写收货人', icon: 'none' });
      return;
    }

    if (!formData.phone) {
      Taro.showToast({ title: '请填写手机号', icon: 'none' });
      return;
    }

    if (!formData.region[0] || !formData.region[1] || !formData.region[2]) {
      Taro.showToast({ title: '请选择所在地区', icon: 'none' });
      return;
    }

    if (!formData.address) {
      Taro.showToast({ title: '请填写详细地址', icon: 'none' });
      return;
    }

    // 实际应用中应调用保存地址的API
    Taro.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500,
      complete: () => {
        Taro.navigateBack();
      }
    });
  };

  return (
    <View className="address-edit-container">
      <View className="form-container">
        {/* 收货人 */}
        <View className="form-item">
          <Text className="label">收货人</Text>
          <Input
            className="input"
            placeholder="请填写收货人"
            value={formData.name}
            onInput={(e) => handleInputChange('name', e)}
          />
        </View>

        {/* 手机号 */}
        <View className="form-item">
          <Text className="label">手机号</Text>
          <Input
            className="input"
            placeholder="请输入联系电话"
            type="number"
            value={formData.phone}
            onInput={(e) => handleInputChange('phone', e)}
          />
        </View>

        {/* 所在地区 */}
        <View className="form-item" onClick={() => setRegionPickerVisible(true)}>
          <Text className="label">所在地区</Text>
          <View className="input">
            {formData.region[0] ? (
              <Text>{`${formData.region[0]}/${formData.region[1]}/${formData.region[2]}`}</Text>
            ) : (
              <Text className="placeholder">省/市/区</Text>
            )}
          </View>
          <Text className="arrow">›</Text>
        </View>

        {/* 详细地址 */}
        <View className="form-item">
          <Text className="label">详细地址</Text>
          <Textarea
            className="textarea"
            placeholder="街道门牌信息"
            value={formData.address}
            onInput={(e) => handleInputChange('address', e)}
          />
        </View>

        {/* 粘贴识别 */}
        <View className="paste-tip" onClick={pasteAndRecognize}>
          <Text>粘贴文本，自动识别收件人信息</Text>
          <Text className="example">如：浙江省杭州市西湖区文一西路588号中节能西溪首座，张三，187****9999</Text>
        </View>

        {/* 上传图片 */}
        <View className="upload-section">
          <Text className="title">上传图片</Text>
          <View className="images-container">
            {images.map((img, index) => (
              <View key={index} className="image-item">
                <Image src={img} className="image" mode="aspectFill" />
                <View className="delete-btn" onClick={() => deleteImage(index)}>×</View>
              </View>
            ))}
            {images.length < 3 && (
              <View className="upload-btn" onClick={uploadImage}>
                <Text className="plus">+</Text>
                <Text className="text">上传</Text>
              </View>
            )}
          </View>
          <Text className="tip">最多上传3张图片</Text>
        </View>

        {/* 设为默认 */}
        <View className="default-section" onClick={toggleDefault}>
          <Text className="label">设为默认</Text>
          <View className={`switch ${formData.isDefault ? 'active' : ''}`}>
            {formData.isDefault && <View className="switch-handle" />}
          </View>
        </View>
      </View>

      {/* 保存按钮 */}
      <View className="save-btn" onClick={saveAddress}>
        <Text>立即保存</Text>
      </View>

      {/* 地区选择器 */}
      {regionPickerVisible && (
        <Picker
          mode="region"
          value={formData.region}
          onChange={handleRegionChange}
          onCancel={() => setRegionPickerVisible(false)}
        >
          <View className="picker-mask" onClick={() => setRegionPickerVisible(false)} />
        </Picker>
      )}
    </View>
  );
}
