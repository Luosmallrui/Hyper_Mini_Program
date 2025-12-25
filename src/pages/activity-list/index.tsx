import { View, Text, ScrollView } from '@tarojs/components'

export default function ActivityListPage() {
  return (
    <ScrollView scrollY style={{height: '100vh', padding: '20px', boxSizing: 'border-box'}}>
      <Text style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'block'}}>全部活动</Text>
      {[1, 2, 3].map(i => (
        <View key={i} style={{marginBottom: '20px', background: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'}}>
           <Text style={{fontWeight: 'bold', fontSize: '18px'}}>活动 {i}: Techno派对</Text>
           <Text style={{display: 'block', color: '#666', marginTop: '5px'}}>时间：本周六 22:00</Text>
           <Text style={{display: 'block', color: '#f00', marginTop: '10px', fontWeight: 'bold'}}>¥88 起</Text>
        </View>
      ))}
    </ScrollView>
  )
}