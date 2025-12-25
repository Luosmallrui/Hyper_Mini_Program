import { View, Text, Button } from '@tarojs/components'

export default function ActivityDetailPage() {
  return (
    <View style={{position: 'relative', height: '100vh', background: '#333'}}>
       <View style={{height: '60%', background: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: '#fff'}}>海报区域</Text>
       </View>
       <View style={{position: 'absolute', bottom: 0, width: '100%', height: '45%', background: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', boxSizing: 'border-box'}}>
          <Text style={{fontSize: '24px', fontWeight: 'bold'}}>Power Flow嘻哈与电子音乐结合</Text>
          <Text style={{display: 'block', fontSize: '28px', fontWeight: 'bold', margin: '15px 0'}}>65¥ - 128¥</Text>
          <View style={{marginTop: 'auto', paddingTop: '20px'}}>
             <Button style={{background: '#333', color: '#fff', borderRadius: '30px'}}>立即购票</Button>
          </View>
       </View>
    </View>
  )
}