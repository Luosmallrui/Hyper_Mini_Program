import { View, Text, Image } from '@tarojs/components';
import './index.less';

export default function BargainPage() {
  return (
    <View className='bargain-container'>
      {/* 顶部横幅 */}
      <View className='banner'>
        <Image
          src='https://via.placeholder.com/750x200?text=砍价活动'
          className='banner-img'
          mode='widthFix'
        />
      </View>

      {/* 砍价商品空状态 */}
      <View className='empty-state'>
        <Image
          src='https://via.placeholder.com/200x200?text=砍价'
          className='empty-icon'
        />
        <Text className='empty-text'>好物乐享 砍出好价格</Text>
        <Text className='empty-subtext'>~ 暂无商品 ~</Text>
      </View>
    </View>
  );
}
