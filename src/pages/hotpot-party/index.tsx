import {View, Text, Image, ScrollView} from '@tarojs/components';
import './index.less';

const hotpotImg = 'https://fruit-1306715736.cos.ap-chengdu.myqcloud.com/fruit2.jpg';


export default function HotpotPartyPage() {
  // 火锅套餐数据
  const packages = [
    {
      id: 1,
      name: '经典双人套餐',
      price: 168,
      originalPrice: 198,
      sales: 128,
      image: 'https://via.placeholder.com/300?text=双人套餐'
    },
    {
      id: 2,
      name: '麻辣四人套餐',
      price: 298,
      originalPrice: 368,
      sales: 86,
      image: 'https://via.placeholder.com/300?text=四人套餐'
    },
    {
      id: 3,
      name: '全家福六人餐',
      price: 458,
      originalPrice: 598,
      sales: 42,
      image: 'https://via.placeholder.com/300?text=六人套餐'
    },
  ];

  // 热门菜品
  const dishes = [
    {id: 1, name: '精品肥牛', price: 48, sales: 256, image: 'https://via.placeholder.com/150?text=精品肥牛'},
    {id: 2, name: '毛肚拼盘', price: 58, sales: 198, image: 'https://via.placeholder.com/150?text=毛肚拼盘'},
    {id: 3, name: '手工虾滑', price: 38, sales: 182, image: 'https://via.placeholder.com/150?text=手工虾滑'},
    {id: 4, name: '雪花牛肉', price: 68, sales: 156, image: 'https://via.placeholder.com/150?text=雪花牛肉'},
  ];

  return (
    <ScrollView className="hotpot-container" scrollY>
      {/* 顶部横幅 */}
      <View className="banner">
        <Image
          src="https://fruit-1306715736.cos.ap-chengdu.myqcloud.com/fruit4.jpg"
          className="banner-img"
          mode="widthFix"
        />
      </View>

      {/* 火锅套餐 */}
      <View className="section">
        <View className="section-header">
          <Text className="section-title">精选火锅套餐</Text>
          <Text className="section-more">更多套餐 {'>'}</Text>
        </View>

        <ScrollView scrollX className="package-list">
          {packages.map(pkg => (
            <View key={pkg.id} className="package-card">
              <Image src="https://fruit-1306715736.cos.ap-chengdu.myqcloud.com/fruit3.jpg" className="package-img"/>
              <View className="package-info">
                <Text className="package-name">{pkg.name}</Text>
                <View className="price-container">
                  <Text className="price">¥{pkg.price}</Text>
                  <Text className="original-price">¥{pkg.originalPrice}</Text>
                </View>
                <Text className="sales">已售{pkg.sales}份</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 热门菜品 */}
      <View className="section">
        <View className="section-header">
          <Text className="section-title">热门菜品</Text>
        </View>

        <View className="dish-grid">
          {dishes.map(dish => (
            <View key={dish.id} className="dish-card">
              <Image src="https://fruit-1306715736.cos.ap-chengdu.myqcloud.com/fruit2.jpg" className="dish-img"/>
              <Text className="dish-name">{dish.name}</Text>
              <View className="dish-footer">
                <Text className="dish-price">¥{dish.price}</Text>
                <Text className="dish-sales">已售{dish.sales}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 锅底选择 */}
      <View className="section">
        <View className="section-header">
          <Text className="section-title">锅底选择</Text>
        </View>

        <View className="soup-grid">
          <View className="soup-item">
            <Image
              src={hotpotImg}
              className="soup-img"
            />
            <Text className="soup-name">麻辣牛油锅</Text>
          </View>

          <View className="soup-item">
            <Image
              src={hotpotImg}
              className="soup-img"
            />
            <Text className="soup-name">番茄浓汤锅</Text>
          </View>

          <View className="soup-item">
            <Image
              src={hotpotImg}
              className="soup-img"
            />
            <Text className="soup-name">养生菌汤锅</Text>
          </View>

          <View className="soup-item">
            <Image
              src={hotpotImg}
              className="soup-img"
            />
            <Text className="soup-name">鸳鸯锅</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
