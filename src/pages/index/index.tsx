import {setTabBarIndex} from "@/store/tabbar";
import {View, Text, Image, Input, Swiper, SwiperItem, Button} from '@tarojs/components';
import Taro, {eventCenter, getCurrentInstance} from "@tarojs/taro";
import {useEffect, useState} from 'react';
import './index.less';

// 扩展全局类型
declare global {
  interface AppInstance {
    globalData: {
      cartItems?: any[];
    };
  }
}

const HomePage = () => {
  const [searchValue, setSearchValue] = useState('');
  const [location, setLocation] = useState('定位中...');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [newItemAdded, setNewItemAdded] = useState(false);

  useEffect(() => {
    getLocation();
    setTabBarIndex(0);

    // 监听购物车更新事件
    eventCenter.on('cartUpdated', () => {
      setNewItemAdded(true);
      setTimeout(() => setNewItemAdded(false), 2000);
    });

    return () => {
      eventCenter.off('cartUpdated');
    };
  }, []);

  // 页面显示时也设置一次，确保状态正确
  Taro.useDidShow(() => {
    setTabBarIndex(0);
    // 从全局数据获取购物车状态
    const app = getCurrentInstance();
    const globalData = app?.app ? ((app.app as unknown) as {
      globalData?: { cartItems?: any[] }
    })?.globalData || {} : {};
    if (globalData.cartItems) {
      setCartItems(globalData.cartItems);
    }
  });

  // 获取定位
  const getLocation = () => {
    Taro.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          getLocationInfo();
        } else {
          Taro.authorize({
            scope: 'scope.userLocation',
            success: () => {
              getLocationInfo();
            },
            fail: () => {
              setLocation('未授权定位');
            }
          });
        }
      }
    });
  };

  const getLocationInfo = () => {
    Taro.getLocation({
      type: 'gcj02', // 使用国内标准坐标系
      altitude: true, // 获取高度信息
      isHighAccuracy: true, // 使用高精度定位
      highAccuracyExpireTime: 4000, // 高精度定位超时时间
      success: (res) => {
        console.log('定位结果:', res);

        // 使用有效的API密钥进行逆地理编码
        Taro.request({
          url: 'https://apis.map.qq.com/ws/geocoder/v1/',
          data: {
            location: `${res.latitude},${res.longitude}`,
            key: '7GEBZ-DLZKN-TRUFI-S7MTP-UISI6-4XBGI', // 需要替换为有效密钥
            get_poi: 1,
            poi_options: 'policy=1;radius=1000'
          },
          success: (response) => {
            console.log('逆地理编码结果:', response.data);
            const data = response.data;
            if (data && data.status === 0) {
              const address = data.result;
              const city = address.address_component.city || address.address_component.district;
              setLocation(city);
            } else {
              console.error('逆地理编码失败:', data);
              setLocation('定位解析失败');
            }
          },
          fail: (error) => {
            console.error('请求失败:', error);
            setLocation('网络请求失败');
          }
        });
      },
      fail: (error) => {
        console.error('定位失败:', error);
        setLocation('定位失败');
      }
    });
  };

  // 添加商品到购物车
  const addToCart = (product) => {
    const app = getCurrentInstance();
    const globalData = app?.app ? ((app.app as unknown) as {
      globalData?: { cartItems?: any[] }
    })?.globalData || {} : {};

    // 初始化全局数据
    if (!globalData.cartItems) {
      globalData.cartItems = [];
      // 更新全局状态
      if (app?.app) {
        ((app.app as unknown) as { globalData?: { cartItems?: any[] } }).globalData = globalData;
      }
      setCartItems([...globalData.cartItems]);
    }

    // 检查是否已有该商品
    const existingItem = globalData.cartItems.find(item => item.id === product.id);

    if (existingItem) {
      // 如果已有，增加数量
      globalData.cartItems = globalData.cartItems.map(item =>
        item.id === product.id ? {...item, quantity: item.quantity + 1} : item
      );
    } else {
      // 如果是新商品，添加到购物车
      globalData.cartItems = [
        ...globalData.cartItems,
        {
          ...product,
          quantity: 1,
          selected: true,
          deliveryType: 'today',
          price: parseFloat(product.price)
        }
      ];
      // 标记有新商品添加
      setNewItemAdded(true);
      setTimeout(() => setNewItemAdded(false), 2000);
    }

    // 更新全局状态
    if (app?.app) {
      ((app.app as unknown) as { globalData?: { cartItems?: any[] } }).globalData = globalData;
    }
    setCartItems([...globalData.cartItems]);

    // 通知购物车页面更新
    eventCenter.trigger('cartUpdated');

    Taro.showToast({
      title: '已添加到购物车',
      icon: 'success'
    });
  };

  // 动物分类卡片
  const animalCategories = [
    {
      name: '澳洲和牛',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
      overlay: true
    },
    {
      name: '新西兰罗姆尼羊',
      image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300&h=200&fit=crop',
      overlay: true
    },
    {
      name: '西班牙伊比利亚黑猪',
      image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=300&h=200&fit=crop',
      overlay: true
    }
  ];

  // 烹饪方式
  const cookingMethods = [
    {name: '煎', icon: '🍳', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=150&h=150&fit=crop'},
    {name: '炒', icon: '🥘', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=150&h=150&fit=crop'},
    {name: '涮', icon: '🍲', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&h=150&fit=crop'},
    {name: '炖', icon: '🥩', image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=150&h=150&fit=crop'},
    {name: '烤', icon: '🔥', image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=150&h=150&fit=crop'}
  ];

  // 横幅数据
  const bannerData = [
    {
      title: '红芋火锅局',
      subtitle: 'HONGHUI',
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=400&fit=crop',
      gradient: 'from-red-600 to-orange-500'
    }
  ];

  // 商品数据
  const products = [
    {
      id: 1,
      name: '澳洲谷饲安格斯M3+雪花原切西冷牛排',
      price: '59.90',
      originalPrice: '8452',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
      brand: 'HONG HUI',
      brandSubtitle: 'butcher life'
    },
    {
      id: 2,
      name: '澳洲谷饲安格斯M3+雪花牛仔骨原切',
      price: '59.90',
      originalPrice: '6854',
      image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
      brand: 'HONG HUI',
      brandSubtitle: 'butcher life'
    },
    {
      id: 3,
      name: '澳洲原切150天小西冷牛排（煎炒两用）',
      price: '19.90',
      originalPrice: '10360',
      image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop',
      brand: 'HONG HUI',
      brandSubtitle: 'butcher life'
    },
    {
      id: 4,
      name: '美国谷饲Prime级佳级原切西冷牛排',
      price: '59.90',
      originalPrice: '6651',
      image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop',
      brand: 'HONG HUI',
      brandSubtitle: 'butcher life'
    }
  ];

  return (
    <View className='premium-home'>
      {/* 沉浸式顶部 */}
      <View className='immersive-header'>
        <View className='status-bar'>
          <View className='location-pin' onClick={getLocation}>
            <Text className='pin-icon'>📍</Text>
            <Text className='city-name'>{location}</Text>
            <Text className='location-arrow'>▼</Text>
          </View>

          {/* 购物车图标 */}
          <View
            className='cart-icon-container'
            onClick={() => Taro.switchTab({url: '/pages/cart/index'})}
          >
            <Text className='cart-icon'>🛒</Text>
            {newItemAdded && <View className='new-item-dot'/>}
            {cartItems.length > 0 && (
              <View className='cart-badge'>
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </View>
            )}
          </View>
        </View>

        <View className='search-section'>
          <View className='premium-search'>
            <Text className='search-icon'>🔍</Text>
            <Input
              placeholder='牛排'
              value={searchValue}
              onInput={(e) => setSearchValue(e.detail.value)}
              className='search-field'
            />
            <Text className='search-button'>搜索</Text>
          </View>
        </View>
      </View>

      {/* 轮播背景 */}
      <Swiper
        className='hero-banner'
        indicatorDots
        autoplay
        interval={3000}
        circular
      >
        <SwiperItem>
          <Image
            src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop'
            mode='aspectFill'
            className='hero-image'
          />
          <View className='hero-overlay'/>
        </SwiperItem>
        <SwiperItem>
          <Image
            src='https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop'
            mode='aspectFill'
            className='hero-image'
          />
          <View className='hero-overlay'/>
        </SwiperItem>
      </Swiper>

      {/* 动物分类卡片 */}
      <View className='animal-showcase'>
        <View className='showcase-grid'>
          {animalCategories.map((animal, index) => (
            <View key={index} className='animal-card'>
              <Image
                src={animal.image}
                mode='aspectFill'
                className='animal-image'
              />
              <View className='animal-overlay'>
                <Text className='animal-name'>{animal.name}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 烹饪方式 */}
      <View className='cooking-methods'>
        <View className='methods-container'>
          {cookingMethods.map((method, index) => (
            <View key={index} className='method-card'>
              <View className='method-image-container'>
                <Image
                  src={method.image}
                  mode='aspectFill'
                  className='method-bg'
                />
                <View className='method-overlay'>
                  <Text className='method-name'>{method.name}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 火锅局横幅 */}
      <Swiper
        className='banner-swiper'
        indicatorDots
        autoplay
        interval={3000}
        circular
      >
        {bannerData.map((item, index) => (
          <SwiperItem key={index}>
            <Image src={item.image} className='banner-bg' mode='aspectFill'/>
            <View className='banner-content'>
              <Text className='banner-title'>{item.title}</Text>
              <Text className='banner-subtitle'>{item.subtitle}</Text>
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      {/* 商品展示区 */}
      <View className='products-showcase'>
        <View className='products-grid'>
          {products.map((product) => (
            <View key={product.id} className='product-card'>
              <View className='product-image-wrapper'>
                <Image
                  src={product.image}
                  mode='aspectFill'
                  className='product-image'
                />
                <View className='brand-logo'>
                  <Text className='brand-name'>{product.brand}</Text>
                  <Text className='brand-subtitle'>{product.brandSubtitle}</Text>
                </View>
                <Button
                  className='add-btn'
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product);
                  }}
                >
                  <Text className='add-icon'>+</Text>
                </Button>
              </View>

              <View className='product-info'>
                <Text className='product-name'>{product.name}</Text>
                <View className='price-section'>
                  <Text className='current-price'>¥{product.price}</Text>
                  <Text className='original-price'>已售 {product.originalPrice}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 底部推广区域 */}
      <View className='promotion-area'>
        <View className='promo-left'>
          <View className='newbie-card'>
            <Image
              src='https://fruit-1306715736.cos.ap-chengdu.myqcloud.com/fruit1.jpg'
              mode='aspectFill'
              className='newbie-bg-image'
            />
            <View className='newbie-overlay'>
              <Text className='promo-title'>新人专享</Text>
              <Text className='promo-subtitle'>天天有折扣</Text>
              <View className='promo-icon'>🎁</View>
            </View>
          </View>
        </View>

        <View className='promo-right'>
          <View className='coupon-card'>
            <Image
              src='https://fruit-1306715736.cos.ap-chengdu.myqcloud.com/fruit2.jpg'
              mode='aspectFill'
              className='coupon-bg-image'
            />
            <View className='coupon-overlay'>
              <Text className='coupon-title'>一优惠券专区一</Text>
              <Text className='coupon-subtitle'>领券享优惠</Text>
              <View className='coupon-icon'>🎟️</View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default HomePage;
