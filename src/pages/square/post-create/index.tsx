import { View, Text, Input, Textarea, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { AtIcon } from 'taro-ui'
import './index.scss'

export default function PostCreatePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])

  // 选择图片
  const handleAddImage = async () => {
    try {
      const res = await Taro.chooseMedia({
        count: 9 - images.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })
      // 这里的 tempFilePaths 是演示用，实际需要上传服务器
      const newImages = res.tempFiles.map(f => f.tempFilePath)
      setImages([...images, ...newImages])
    } catch (e) {
      console.log('取消选择')
    }
  }

  // 删除图片
  const handleDeleteImage = (index: number) => {
    const newImgs = [...images]
    newImgs.splice(index, 1)
    setImages(newImgs)
  }

  // 发布
  const handlePublish = () => {
    if (!content && images.length === 0) {
      Taro.showToast({ title: '写点什么吧', icon: 'none' })
      return
    }

    Taro.showLoading({ title: '发布中' })
    
    // 模拟网络请求
    setTimeout(() => {
      Taro.hideLoading()
      
      // 显示自定义的成功Toast (截图样式)
      Taro.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 2000
      })
      
      // 延迟返回上一页
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    }, 1000)
  }

  return (
    <View className='create-page'>
      {/* 顶部导航栏 (Taro 默认有，如果需要自定义可隐藏原生导航栏自己写) */}
      
      {/* 图片选择区 */}
      <View className='image-grid'>
        {images.map((img, idx) => (
          <View key={idx} className='image-item'>
            <Image src={img} mode='aspectFill' className='thumb' />
            <View className='delete-btn' onClick={() => handleDeleteImage(idx)}>
              <AtIcon value='trash' size='14' color='#fff' />
            </View>
          </View>
        ))}
        {/* 添加按钮 */}
        {images.length < 9 && (
          <View className='add-btn' onClick={handleAddImage}>
            <Text className='add-text'>添加</Text>
          </View>
        )}
      </View>

      {/* 输入区域 */}
      <View className='input-section'>
        <Input 
          className='title-input' 
          placeholder='添加标题' 
          placeholderClass='ph-style'
          value={title}
          onInput={e => setTitle(e.detail.value)}
        />
        <View className='divider' />
        <Textarea 
          className='content-input' 
          placeholder='添加正文' 
          placeholderClass='ph-style'
          value={content}
          onInput={e => setContent(e.detail.value)}
          maxlength={1000}
        />
      </View>

      {/* 底部功能栏 */}
      <View className='options-section'>
        <View className='tag-row'>
          <Text className='section-label'>#话题</Text>
          <View className='tag-pill'><Text>派对</Text></View>
        </View>
        
        <View className='options-grid'>
           <View className='option-item'>音乐</View>
           <View className='option-item'>骑行</View>
           <View className='option-item'>滑板</View>
           <View className='option-item'>纹身</View>
        </View>

        <View className='link-section'>
          <View className='link-row'>
            <Text>关联</Text>
          </View>
          <View className='link-cards'>
            <View className='link-card'>
               <Text>吉林省长春市...</Text>
               <AtIcon value='close' size='12' color='#999'/>
            </View>
            <View className='link-card'>
               <Text>PURELOOP...</Text>
               <AtIcon value='close' size='12' color='#999'/>
            </View>
          </View>
        </View>
      </View>

      {/* 底部按钮 */}
      <View className='bottom-bar'>
        <View className='publish-btn' onClick={handlePublish}>
          <Text>发布</Text>
        </View>
      </View>
    </View>
  )
}