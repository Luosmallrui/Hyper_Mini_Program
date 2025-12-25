import { View, Input, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import './index.scss'

export default function SearchPage() {
  // 模拟清空历史
  const handleClear = () => {
    Taro.showToast({ title: '已清空', icon: 'none' })
  }

  return (
    <View className='search-page'>
      {/* 顶部搜索框 */}
      <View className='search-container'>
         <AtIcon value='search' size='18' color='#999'/>
         <Input 
           className='search-input' 
           placeholder='搜索商家、俱乐部、活动名称、主办方等' 
           placeholderClass='input-placeholder'
           autoFocus
         />
      </View>

      {/* 历史搜索 */}
      <View className='history-section'>
         <View className='section-header'>
            <Text className='title'>历史搜索</Text>
            <Text className='clear-btn' onClick={handleClear}>清空</Text>
         </View>
         
         <View className='tags-row'>
            <View className='history-tag'>YTS</View>
            <View className='history-tag'>HYPER</View>
            <View className='history-tag'>TRAPK</View>
         </View>
      </View>
    </View>
  )
}