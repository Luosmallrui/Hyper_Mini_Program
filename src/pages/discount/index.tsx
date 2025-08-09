import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.less';
import hotpotImg from '../../assets/fruit/fruit1.jpg';

export default function DiscountPage() {
  // 功能入口列表
  const features = [
    { id: 'group-buy', name: '拼团', icon: 'https://tse2-mm.cn.bing.net/th/id/OIP-C.yE57Q4bW0wW_OuUvxjBA-wHaHa?w=189&h=189&c=7&r=0&o=7&pid=1.7&rm=3' },
    { id: 'bargain', name: '砍价', icon: 'https://tse2-mm.cn.bing.net/th/id/OIP-C.yE57Q4bW0wW_OuUvxjBA-wHaHa?w=189&h=189&c=7&r=0&o=7&pid=1.7&rm=3'},
    { id: 'promotion', name: '促销活动', icon: 'https://tse2-mm.cn.bing.net/th/id/OIP-C.yE57Q4bW0wW_OuUvxjBA-wHaHa?w=189&h=189&c=7&r=0&o=7&pid=1.7&rm=3' },
    { id: 'flash-sale', name: '限时秒杀', icon:'https://tse2-mm.cn.bing.net/th/id/OIP-C.yE57Q4bW0wW_OuUvxjBA-wHaHa?w=189&h=189&c=7&r=0&o=7&pid=1.7&rm=3' },
  ];

  // 促销商品列表
  const promoProducts = [
    {
      id: 1,
      name: '澳洲谷饲小西冷牛排',
      image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
      price: 19.90,
      originalPrice: 39.90,
      stock: 499921
    },
    {
      id: 2,
      name: '澳洲安格斯西冷牛排',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
      price: 25.00,
      originalPrice: 45.00,
      stock: 7866
    },
    {
      id: 3,
      name: '美国极佳级原切西冷牛排',
      image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop',
      price: 36.90,
      originalPrice: 69.90,
      stock: 4999901
    },
  ];

  // 跳转到功能页面
  const navigateToFeature = (featureId: string) => {
    Taro.navigateTo({ url: `/pages/${featureId}/index` });
  };

  return (
    <ScrollView className="discount-container" scrollY>
      {/* 顶部横幅 */}
      <View className="banner">
        <Image
          src={hotpotImg}
          className="banner-img"
          mode="widthFix"
        />
      </View>

      {/* 功能入口 */}
      <View className="feature-grid">
        {features.map(feature => (
          <View
            key={feature.id}
            className="feature-item"
            onClick={() => navigateToFeature(feature.id)}
          >
            <Image src={hotpotImg} className="feature-icon" />
            <Text className="feature-name">{feature.name}</Text>
          </View>
        ))}
      </View>

      {/* 促销活动标题 */}
      <View className="section-header">
        <Text className="section-title">促销活动</Text>
        <Text
          className="section-more"
          onClick={() => navigateToFeature('promotion')}
        >
          查看更多 { '>' }
        </Text>
      </View>

      {/* 促销商品列表 */}
      <ScrollView scrollX className="promo-scroll">
        {promoProducts.map(product => (
          <View key={product.id} className="promo-card">
            <Image src={product.image} className="product-img" />
            <Text className="product-name">{product.name}</Text>
            <View className="price-container">
              <Text className="current-price">¥{product.price.toFixed(2)}</Text>
              <Text className="original-price">¥{product.originalPrice.toFixed(2)}</Text>
            </View>
            <View className="stock-container">
              <Text className="stock-text">库存: {product.stock}</Text>
            </View>
            <View className="promo-tag">促销</View>
          </View>
        ))}
      </ScrollView>

      {/* 拼团推荐标题 */}
      <View className="section-header">
        <Text className="section-title">拼团推荐</Text>
        <Text
          className="section-more"
          onClick={() => navigateToFeature('group-buy')}
        >
          查看更多  { '>' }
        </Text>
      </View>

      {/* 拼团商品列表 */}
      <View className="group-buy-list">
        <View className="group-buy-card">
          <Image
            src={hotpotImg}
            className="group-buy-img"
          />
          <View className="group-buy-info">
            <Text className="product-title">好友两人拼33.9一块，前牛排，炒牛肉都可以，俗称牛里脊，牛身上最嫩的部位，老少皆宜</Text>
            <View className="spec-container">
              <Text className="spec">规格：200g</Text>
              <Text className="spec">类型：2人团</Text>
            </View>
            <View className="price-container">
              <Text className="group-price">¥33.90</Text>
              <Text className="original-price">¥49.90</Text>
            </View>
          </View>
          <View className="group-buy-btn">去拼团</View>
        </View>

        <View className="group-buy-card">
          <Image
            src={hotpotImg}
            className="group-buy-img"
          />
          <View className="group-buy-info">
            <Text className="product-title">美团Prime极佳级原切小牛排，雪花纹理锁住丰盈汁水，入口肉香十足有嚼劲</Text>
            <View className="spec-container">
              <Text className="spec">规格：150g</Text>
              <Text className="spec">类型：2人团</Text>
            </View>
            <View className="price-container">
              <Text className="group-price">¥22.90</Text>
              <Text className="original-price">¥36.90</Text>
            </View>
          </View>
          <View className="group-buy-btn">去拼团</View>
        </View>
      </View>
    </ScrollView>
  );
}
