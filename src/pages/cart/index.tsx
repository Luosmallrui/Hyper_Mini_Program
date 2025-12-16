// src/pages/cart/index.tsx
import { View, Text, Image, ScrollView, Swiper, SwiperItem, Button } from '@tarojs/components';
import Taro, { usePageScroll,eventCenter, getCurrentInstance } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { AtIcon, AtTag } from 'taro-ui';
import './index.less';

// 商品数据类型
interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selected: boolean;
  deliveryType: 'today' | 'tomorrow';
  discount?: boolean;
}
// 扩展全局类型
declare global {
  interface AppInstance {
    globalData: {
      cartItems?: any[];
    };
  }
}

export default function CartPage() {
  // 配送方式状态
  const [deliveryType, setDeliveryType] = useState<'today' | 'tomorrow'>('today');

  // 购物车数据状态
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // 全选状态
  const [selectAll, setSelectAll] = useState(false);

  // 是否显示删除按钮
  const [showDelete, setShowDelete] = useState(false);

  // 滚动状态
  const [isScrolled, setIsScrolled] = useState(false);

  // 监听购物车更新
  useEffect(() => {
    const app = getCurrentInstance();
    // 修改为仅监听事件，不进行初始化操作
    // 监听购物车更新事件
    const callback = () => {
      const updatedCart = app?.app ? ((app.app as unknown) as { globalData?: { cartItems?: any[] } })?.globalData?.cartItems || [] : [];
      setCartItems([...updatedCart]);
      updateSelectAll(updatedCart);
    };
    eventCenter.on('cartUpdated', callback);

    return () => {
      eventCenter.off('cartUpdated', callback);
    };
  }, []);

  // 推荐商品数据
  const recommendedItems = [
    {
      id: 101,
      name: '澳洲和牛A级雪花牛肉炒不柴系列',
      price: 125.00,
      image: 'https://fruit-1306715736.cos.ap-chengdu.myqcloud.com/fruit2.jpg'
    },
    {
      id: 102,
      name: '美国谷饲安格斯小西冷牛排',
      price: 25.00,
      image: 'https://images.unsplash.com/photo-1615992174118-9b8e9be025e7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 103,
      name: '每日吃遍全球好红肉系列三',
      price: 29.90,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 104,
      name: '每日刚需必买好肉不贵系列',
      price: 19.90,
      image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
    }
  ];

  // 初始化购物车数据
  useEffect(() => {
    // 模拟从API获取数据
    const mockCartData: CartItem[] = [
      {
        id: 1,
        name: '精品肥牛',
        price: 48,
        image: 'https://images.unsplash.com/photo-1615992174118-9b8e9be025e7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
        quantity: 1,
        selected: true,
        deliveryType: 'today'
      },
      {
        id: 2,
        name: '手工虾滑',
        price: 38,
        image: 'https://fruit-1306715736.cos.ap-chengdu.myqcloud.com/fruit2.jpg',
        quantity: 2,
        selected: true,
        deliveryType: 'tomorrow',
        discount: true
      },
      {
        id: 3,
        name: '毛肚拼盘',
        price: 58,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
        quantity: 1,
        selected: true,
        deliveryType: 'today'
      }
    ];

    setCartItems(mockCartData);
    updateSelectAll(mockCartData);
  }, []);

  // 监听滚动
  usePageScroll((e) => {
    setIsScrolled(e.scrollTop > 10);
  });

  // 更新全选状态
  const updateSelectAll = (items: CartItem[]) => {
    const allSelected = items.length > 0 && items.every(item => item.selected);
    setSelectAll(allSelected);
  };

  // 切换配送方式
  const toggleDeliveryType = (type: 'today' | 'tomorrow') => {
    setDeliveryType(type);
  };

  // 增减商品数量
  const updateQuantity = (id: number, change: number) => {
    setCartItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + change) } : item
      );
      return newItems;
    });
  };

  // 选择/取消选择单个商品
  const toggleItemSelection = (id: number) => {
    setCartItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      );
      updateSelectAll(newItems);
      return newItems;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    setCartItems(prevItems => {
      const newItems = prevItems.map(item => ({ ...item, selected: !selectAll }));
      setSelectAll(!selectAll);
      return newItems;
    });
  };

  // 删除选中商品
  const deleteSelectedItems = () => {
    setCartItems(prevItems => {
      const newItems = prevItems.filter(item => !item.selected);
      updateSelectAll(newItems);
      return newItems;
    });
    Taro.showToast({
      title: '已删除选中商品',
      icon: 'success'
    });
  };

  // 添加商品到购物车
  const addToCart = (item: any) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [
          ...prevItems,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: 1,
            selected: true,
            deliveryType: 'today' as 'today' | 'tomorrow', // 显式指定类型
          }
        ];
      }
    });
    Taro.showToast({
      title: '已添加到购物车',
      icon: 'success'
    });
  };

  // 计算总价和选中数量
  const calculateTotals = () => {
    const selectedItems = cartItems.filter(item => item.selected);
    const totalPrice = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );
    const totalCount = selectedItems.reduce(
      (sum, item) => sum + item.quantity, 0
    );

    return { totalPrice, totalCount };
  };

  const { totalPrice, totalCount } = calculateTotals();

  // 跳转到商品详情
  const navigateToProduct = (id: number) => {
    Taro.navigateTo({
      url: `/pages/product/index?id=${id}`
    });
  };

  // 切换删除按钮显示状态
  const toggleDeleteShow = () => {
    setShowDelete(!showDelete);
  };

  return (
    <View className='cart-container'>
      {/* 顶部导航栏 */}
      <View className={`cart-header ${isScrolled ? 'scrolled' : ''}`}>
        <Text className='title'>购物车</Text>
        <View className='actions'>
          <AtIcon value='search' size='20' color='#333' />
          <AtIcon value='message' size='20' color='#333' />
          <Text className='edit-btn' onClick={toggleDeleteShow}>
            {showDelete ? '完成' : '编辑'}
          </Text>
        </View>
      </View>

      {/* 配送方式选择区域 */}
      <View className='delivery-section'>
        <View className='delivery-options'>
          <View
            className={`option ${deliveryType === 'today' ? 'active' : ''}`}
            onClick={() => toggleDeliveryType('today')}
          >
            当天达
          </View>
          <View
            className={`option ${deliveryType === 'tomorrow' ? 'active' : ''}`}
            onClick={() => toggleDeliveryType('tomorrow')}
          >
            次日达
          </View>
        </View>

        {cartItems.length > 0 && (
          <View className='delete-section'>
            <View
              className={`delete-btn ${showDelete ? 'show' : ''}`}
              onClick={deleteSelectedItems}
            >
              <AtIcon value='trash' size='16' color='#fff' />
              删除
            </View>
          </View>
        )}
      </View>

      {/* 购物车内容区域 */}
      <ScrollView scrollY className='cart-content'>
        {cartItems.length === 0 ? (
          // 购物车为空状态
          <View className='empty-cart'>
            <Image
              className='empty-image'
              src='https://images.unsplash.com/photo-1586208958839-06c17cacdf08?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
              mode='aspectFit'
            />
            <Text className='empty-text'>暂无商品，去添加点什么吧</Text>
            <Button className='browse-btn' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
              去逛逛
            </Button>
          </View>
        ) : (
          // 购物车商品列表
          <>
            <View className='section-title'>
              <Text className='title'>一起买,更实惠</Text>
            </View>

            {cartItems.filter(item => item.deliveryType === deliveryType).map(item => (
              <View
                key={item.id}
                className='cart-item'
                onClick={() => navigateToProduct(item.id)}
              >
                <View
                  className='item-select'
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItemSelection(item.id);
                  }}
                >
                  <View className={`select-icon ${item.selected ? 'selected' : ''}`}>
                    {item.selected && <AtIcon value='check' size='12' color='#fff' />}
                  </View>
                </View>

                <Image src={item.image} className='item-image' />

                <View className='item-info'>
                  <Text className='item-name'>{item.name}</Text>
                  {item.discount && (
                    <AtTag type='primary' size='small' circle active>
                      限时优惠
                    </AtTag>
                  )}
                  <View className='item-bottom'>
                    <Text className='item-price'>¥{item.price.toFixed(2)}</Text>
                    <View className='quantity-control'>
                      <View
                        className='btn minus'
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, -1);
                        }}
                      >
                        -
                      </View>
                      <Text className='quantity'>{item.quantity}</Text>
                      <View
                        className='btn plus'
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, 1);
                        }}
                      >
                        +
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* 推荐商品区域 */}

          <View>
            <View className='section-title'>
              <Text className='title'>猜你喜欢</Text>
            </View>

            <Swiper
              className='recommend-swiper'
              indicatorColor='#999'
              indicatorActiveColor='#07c160'
              circular
              indicatorDots
              autoplay
            >
              {recommendedItems.map(item => (
                <SwiperItem key={item.id}>
                  <View className='recommend-item'>
                    <Image src={item.image} className='recommend-image' />
                    <Text className='recommend-name'>{item.name}</Text>
                    <Text className='recommend-price'>¥{item.price.toFixed(2)}</Text>
                    <Button
                      className='add-btn'
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                    >
                      <AtIcon value='add' size='16' color='#fff' />
                    </Button>
                  </View>
                </SwiperItem>
              ))}
            </Swiper>
          </View>
      </ScrollView>

      {/* 底部结算栏 */}
      {cartItems.length > 0 ? (
        <>
          <View className='select-all' onClick={toggleSelectAll}>
            <View className={`select-icon ${selectAll ? 'selected' : ''}`}>
              {selectAll && <AtIcon value='check' size='12' color='#fff' />}
            </View>
            <Text>全选</Text>
          </View>

          <View className='total-section'>
            <Text className='total-text'>总价: </Text>
            <Text className='total-price'>¥{totalPrice.toFixed(2)}</Text>
          </View>

          <View className='checkout-btn'>
            <Text>结算({totalCount})</Text>
          </View>
        </>
      ) : (
        <View className='empty-checkout'>
          <Text>购物车是空的</Text>
        </View>
      )}

      {/* 底部导航栏 */}
      <View className='bottom-tabbar'>
        <View className='tab-item active'>
          <AtIcon value='home' size='20' color='#07c160' />
          <Text>首页</Text>
        </View>
        <View className='tab-item'>
          <AtIcon value='discount' size='20' color='#999' />
          <Text>优惠</Text>
        </View>
        <View className='tab-item'>
          <AtIcon value='shopping-bag' size='20' color='#999' />
          <Text>火锅局</Text>
        </View>
        <View className='tab-item'>
          <AtIcon value='shopping-cart' size='20' color='#07c160' />
          <Text>购物车</Text>
        </View>
        <View className='tab-item'>
          <AtIcon value='user' size='20' color='#999' />
          <Text>我的</Text>
        </View>
      </View>
    </View>
  );
}
