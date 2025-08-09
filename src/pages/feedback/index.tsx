import Taro from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, Radio, RadioGroup, Textarea, Image, Input, Button } from '@tarojs/components';
import './index.less';

interface FeedbackProps {}

const Feedback: React.FC<FeedbackProps> = () => {
  // 反馈类型：BUG反馈 | 体验反馈
  const [, setFeedbackType] = useState<'bug' | 'experience'>('bug');
  // 反馈内容
  const [content, setContent] = useState('');
  // 上传的图片
  const [images, setImages] = useState<string[]>([]);
  // 联系人姓名
  const [name, setName] = useState('');
  // 联系方式（电话/邮箱）
  const [contact, setContact] = useState('');

  // 切换反馈类型
  const handleTypeChange = (e: any) => {
    setFeedbackType(e.detail.value as 'bug' | 'experience');
  };

  // 输入反馈内容
  const handleContentChange = (e: any) => {
    setContent(e.detail.value);
  };

  // 上传图片（模拟）
  const handleImageUpload = () => {
    Taro.chooseImage({
      count: 3, // 最多上传3张
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
    }).then((res) => {
      setImages([...images, ...res.tempFilePaths]);
    });
  };

  // 删除图片
  const handleImageDelete = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // 提交反馈
  const handleSubmit = () => {
    if (!content.trim()) {
      Taro.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }

    // 模拟提交到服务器
    Taro.showLoading({ title: '提交中...' });
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showToast({ title: '提交成功' });
      // 清空表单
      setFeedbackType('bug');
      setContent('');
      setImages([]);
      setName('');
      setContact('');
    }, 1500);
  };

  // 跳转到反馈记录
  const goToRecords = () => {
    Taro.navigateTo({ url: '/pages/feedback-records/index' });
  };

  // @ts-ignore
  return (
    <View className="feedback-page">
      {/* 标题 */}
      <View className="page-title">问题反馈</View>

      {/* 反馈类型 */}
      <View className="form-item">
        <Text className="label">* 反馈类型</Text>
        <RadioGroup onChange={handleTypeChange}>
          <Radio className="radio" value="bug">BUG反馈</Radio>
          <Radio className="radio" value="experience">体验反馈</Radio>
        </RadioGroup>
      </View>

      {/* 反馈内容 */}
      <View className="form-item">
        <Text className="label">* 反馈内容</Text>
        <Textarea
          className="textarea"
          placeholder="请输入文字"
          value={content}
          onInput={handleContentChange}
          maxlength={200}
          autoHeight
        />
        <Text className="word-count">{content.length}/200字</Text>
      </View>

      {/* 图片上传 */}
      <View className="form-item">
        <Text className="label">* 图片上传</Text>
        <Text className="hint">（上传问题描述相关的图片）</Text>
        <View className="image-upload">
          {images.map((url, index) => (
            <View className="image-item" key={index}>
              <Image className="image" src={url} mode="aspectFill" />
              <View className="delete-btn" onClick={() => handleImageDelete(index)}>
                ×
              </View>
            </View>
          ))}
          <View className="upload-btn" onClick={handleImageUpload}>
            +
          </View>
        </View>
      </View>

      {/* 联系方式 */}
      <View className="form-item">
        <Text className="label">* 联系方式</Text>
        <Input
          className="input"
          placeholder="请填写您的姓名"
          value={name}
          onInput={(e) => setName(e.detail.value)}
        />
        <Input
          className="input"
          placeholder="请填写您的电话或邮箱"
          value={contact}
          onInput={(e) => setContact(e.detail.value)}
        />
      </View>

      {/* 提交按钮 */}
      <Button className="submit-btn" onClick={handleSubmit}>
        提交反馈
      </Button>

      {/* 反馈记录入口 */}
      <View className="record-link" onClick={goToRecords}>
        反馈记录
      </View>
    </View>
  );
};

export default Feedback;
