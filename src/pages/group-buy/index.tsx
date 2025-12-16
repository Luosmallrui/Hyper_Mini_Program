import { View, Text, Image, ScrollView } from '@tarojs/components';
import './index.less';

export default function GroupBuyPage() {
  // 拼团商品列表
  const groupProducts = [
    {
      id: 1,
      name: '牛里脊',
      desc: '好友两人拼33.9一块，前牛排，炒牛肉都可以，俗称牛里脊，牛身上最嫩的部位，老少皆宜',
      image: 'https://via.placeholder.com/300?text=牛里脊',
      price: 33.90,
      originalPrice: 49.90,
      spec: '规格：200g',
      type: '类型：2人团',
    },
    {
      id: 2,
      name: '原切小牛排',
      desc: '美团Prime极佳级原切小牛排，雪花纹理锁住丰盈汁水，入口肉香十足有嚼劲',
      image: 'https://via.placeholder.com/300?text=原切小',
      price: 22.90,
      originalPrice: 36.90,
      spec: '规格：150g',
      type: '类型：2人团',
    },
    {
      id: 3,
      name: '澳洲安格斯M3+牡蛎肉',
      desc: '澳洲安格斯M3+牡蛎肉牛排，像牡蛎一样的细嫩肩胛肉，细嫩多汁，营养丰富',
      image: 'https://via.placeholder.com/300?text=牡蛎肉',
      price: 45.90,
      originalPrice: 69.90,
      spec: '规格：200g',
      type: '类型：2人团',
    },
  ];

  return (
    <ScrollView className='group-buy-container' scrollY>
      {/* 顶部搜索栏 */}
      <View className='search-bar'>
        <View className='search-input'>
          <Text className='search-icon'>🔍</Text>
          <Text className='placeholder'>搜索拼团商品</Text>
        </View>
      </View>

      {/* 拼团商品列表 */}
      <View className='group-buy-list'>
        {groupProducts.map(product => (
          <View key={product.id} className='group-buy-card'>
            <Image src={product.image} className='product-img' />
            <View className='product-info'>
              <Text className='product-name'>{product.name}</Text>
              <Text className='product-desc'>{product.desc}</Text>
              <View className='spec-container'>
                <Text className='spec'>{product.spec}</Text>
                <Text className='spec'>{product.type}</Text>
              </View>
              <View className='price-container'>
                <Text className='group-price'>¥{product.price.toFixed(2)}</Text>
                <Text className='original-price'>¥{product.originalPrice.toFixed(2)}</Text>
              </View>
            </View>
            <View className='group-buy-btn'>去拼团</View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
