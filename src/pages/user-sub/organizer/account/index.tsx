import { Image, ScrollView, Text, View } from '@tarojs/components'
import { organizerAvatar } from '../mock'

const ACCOUNT_INFO_ROWS = [
  ['商家名称', 'Hyper Event Studio'],
  ['联系人', 'Alex / 138 0000 0000'],
  ['常驻城市', '成都 · 武侯区'],
  ['主营方向', '夜店派对 / Live House / 主题活动'],
] as const

export default function OrganizerAccountView() {
  return (
    <ScrollView className="organizer-scroll" scrollY>
      <View className="account-hero-card">
        <Image className="account-avatar" src={organizerAvatar} mode="aspectFill" />
        <View className="account-main">
          <Text className="account-title">HYPER 派对主办方</Text>
          <Text className="account-sub">已完成实名认证 · 成都主理人计划</Text>
        </View>
      </View>

      <View className="account-card-list">
        {ACCOUNT_INFO_ROWS.map(([label, value]) => (
          <View key={label} className="account-info-card">
            <Text className="account-info-label">{label}</Text>
            <Text className="account-info-value">{value}</Text>
          </View>
        ))}
      </View>

      <View className="account-action-card">
        <Text className="account-action-title">账户安全</Text>
        <View className="account-switch-row">
          <Text>重要操作短信提醒</Text>
          <View className="fake-switch on" />
        </View>
        <View className="account-switch-row">
          <Text>审核失败邮件同步</Text>
          <View className="fake-switch" />
        </View>
      </View>
      <View className="organizer-safe-bottom" />
    </ScrollView>
  )
}
