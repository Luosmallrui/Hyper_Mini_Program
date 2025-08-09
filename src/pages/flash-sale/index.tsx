import { View, Text, Image, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import './index.less';

export default function FlashSalePage() {
  // 秒杀时间段
  const timeSlots = [
    { id: 1, time: '07:00', status: '抢购中' },
    { id: 2, time: '10:00', status: '抢购中' },
    { id: 3, time: '13:00', status: '抢购中' },
    { id: 4, time: '16:00', status: '抢购中' },
    { id: 5, time: '19:00', status: '即将开始' },
    { id: 6, time: '22:00', status: '即将开始' },
  ];

  // 当前选中的时间段
  const [activeSlot, setActiveSlot] = useState(1);

  return (
    <View className="flash-sale-container">
      {/* 秒杀时间段 */}
      <ScrollView scrollX className="time-slots">
        {timeSlots.map(slot => (
          <View
            key={slot.id}
            className={`time-slot ${activeSlot === slot.id ? 'active' : ''}`}
            onClick={() => setActiveSlot(slot.id)}
          >
            <Text className="time">{slot.time}</Text>
            <Text className="status">{slot.status}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 秒杀商品空状态 */}
      <View className="empty-state">
        <Image
          src="https://via.placeholder.com/200x200?text=秒杀"
          className="empty-icon"
        />
        <Text className="empty-text">~ 暂无商品 ~</Text>
      </View>
    </View>
  );
}
