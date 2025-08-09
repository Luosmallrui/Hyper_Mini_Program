import { View, Text, Image, ScrollView } from '@tarojs/components';
import './index.less';

export default function PromotionPage() {
  // 促销商品列表
  const promoProducts = [
    {
      id: 1,
      name: '澳洲谷饲小西冷牛排',
      image: 'https://via.placeholder.com/300?text=牛排1',
      price: 19.90,
      originalPrice: 39.90,
      stock: 499921
    },
    {
      id: 2,
      name: '澳洲安格斯西冷牛排',
      image: 'https://via.placeholder.com/300?text=牛排2',
      price: 25.00,
      originalPrice: 45.00,
      stock: 7866
    },
    {
      id: 3,
      name: '美国极佳级原切西冷牛排',
      image: 'https://via.placeholder.com/300?text=牛排3',
      price: 36.90,
      originalPrice: 69.90,
      stock: 4999901
    },
    {
      id: 4,
      name: '澳洲和牛M9眼肉牛排',
      image: 'https://via.placeholder.com/300?text=牛排4',
      price: 89.90,
      originalPrice: 129.90,
      stock: 1560
    },
    {
      id: 5,
      name: '安格斯牛小排',
      image: 'https://via.placeholder.com/300?text=牛排5',
      price: 68.00,
      originalPrice: 98.00,
      stock: 3421
    },
  ];

  return (
    <ScrollView className="promotion-container" scrollY>
      {/* 顶部搜索栏 */}
      <View className="search-bar">
        <View className="search-input">
          <Text className="search-icon">🔍</Text>
          <Text className="placeholder">搜索促销商品</Text>
        </View>
      </View>

      {/* 促销商品列表 */}
      <View className="promo-grid">
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
      </View>
    </ScrollView>
  );
}
