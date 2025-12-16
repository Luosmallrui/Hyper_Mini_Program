import { View, Text,  ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.less';

// 优惠券类型
type Coupon = {
  id: number;
  title: string;
  value: number;
  minAmount: number;
  description: string;
  type: 'general' | 'product'; // 通用券或商品券
  validity: string; // 有效期
  isClaimed: boolean; // 是否已领取
};

export default function CouponPage() {
  // 优惠券数据
  const [coupons, setCoupons] = useState<Coupon[]>([
    {
      id: 1,
      title: '（通用票）任性吃肉券1000',
      value: 100,
      minAmount: 1000,
      description: '不限时',
      type: 'general',
      validity: '2023-12-31',
      isClaimed: true
    },
    {
      id: 2,
      title: '（通用票）任性吃肉券500',
      value: 40,
      minAmount: 500,
      description: '不限时',
      type: 'general',
      validity: '2023-12-31',
      isClaimed: false
    },
    {
      id: 3,
      title: '（通用票）任性吃肉券300',
      value: 20,
      minAmount: 300,
      description: '不限时',
      type: 'general',
      validity: '2023-12-31',
      isClaimed: false
    },
    {
      id: 4,
      title: '（通用票）任性吃肉券200',
      value: 10,
      minAmount: 200,
      description: '不限时',
      type: 'general',
      validity: '2023-12-31',
      isClaimed: false
    },
    {
      id: 5,
      title: '（商品券）新人专享券',
      value: 3,
      minAmount: 100,
      description: '不限时',
      type: 'product',
      validity: '2023-12-31',
      isClaimed: false
    }
  ]);

  // 领取优惠券
  const claimCoupon = (id: number) => {
    setCoupons(coupons.map(coupon => {
      if (coupon.id === id) {
        return { ...coupon, isClaimed: true };
      }
      return coupon;
    }));

    Taro.showToast({
      title: '领取成功',
      icon: 'success',
      duration: 1500
    });
  };

  // 返回上一页
  const handleBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className='coupon-container'>
      {/* 顶部标题栏 */}
      <View className='header'>
        <View className='back-btn' onClick={handleBack}>
          <Text className='back-icon'>‹</Text>
        </View>
        <Text className='title'>领取优惠券</Text>
      </View>

      {/* 优惠券列表 */}
      <ScrollView scrollY className='coupon-list'>
        {coupons.map(coupon => (
          <View
            key={coupon.id}
            className={`coupon-card ${coupon.isClaimed ? 'claimed' : ''}`}
          >
            {/* 左侧价值区域 */}
            <View className='coupon-value'>
              <Text className='value-text'>¥{coupon.value.toFixed(2)}</Text>
              <Text className='condition'>满{coupon.minAmount.toFixed(2)}元可用</Text>
            </View>

            {/* 右侧信息区域 */}
            <View className='coupon-info'>
              <Text className='coupon-title'>{coupon.title}</Text>
              <Text className='coupon-desc'>{coupon.description}</Text>
              <Text className='coupon-validity'>有效期至: {coupon.validity}</Text>

              {/* 按钮区域 */}
              {coupon.isClaimed ? (
                <View className='claimed-btn'>已领取</View>
              ) : (
                <View
                  className='claim-btn'
                  onClick={() => claimCoupon(coupon.id)}
                >
                  立即领取
                </View>
              )}
            </View>

            {/* 角标 */}
            {coupon.type === 'product' && (
              <View className='coupon-tag'>商品券</View>
            )}
          </View>
        ))}

        {/* 底部提示 */}
        <View className='bottom-tip'>
          <Text>我也是有底线的</Text>
        </View>
      </ScrollView>
    </View>
  );
}
