import { ScrollView, Text, View } from '@tarojs/components'
import { AtIcon } from 'taro-ui'

const MORE_ITEMS = [
  { title: '活动商家', desc: '管理合作商家与供应资源', icon: 'shopping-bag' },
  { title: '场地排期', desc: '查看未来 30 天档期安排', icon: 'calendar' },
  { title: '营销组件', desc: '设置早鸟票、优惠券与会员折扣', icon: 'star-2' },
  { title: '品牌设置', desc: '管理 Logo、主色和分享信息', icon: 'settings' },
]

export default function OrganizerMoreView() {
  return (
    <ScrollView className="organizer-scroll" scrollY>
      <View className="more-grid">
        {MORE_ITEMS.map((item) => (
          <View key={item.title} className="more-card">
            <View className="more-card-icon">
              <AtIcon value={item.icon as any} size="22" color="#fff" />
            </View>
            <Text className="more-card-title">{item.title}</Text>
            <Text className="more-card-desc">{item.desc}</Text>
          </View>
        ))}
      </View>
      <View className="organizer-safe-bottom" />
    </ScrollView>
  )
}
