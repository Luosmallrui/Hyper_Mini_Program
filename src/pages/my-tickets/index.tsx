import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'

export default function MyTicketsPage() {
  // 模拟空状态，如果想看有票状态，可以改这里
  const hasTickets = false 

  return (
    <View style={{height: '100vh', background: '#f9f9f9', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '100px'}}>
      {hasTickets ? (
         <Text>二维码显示区</Text>
      ) : (
        <>
          <View style={{width: '120px', height: '120px', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'}}>
             <AtIcon value='tags' size='40' color='#ccc'/>
          </View>
          <Text style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '10px'}}>买到的门票都会存在这里</Text>
          <Text style={{fontSize: '14px', color: '#999', marginBottom: '30px'}}>试试开启活动之旅吧</Text>
          <Button 
            style={{background: '#fff', border: '1px solid #ccc', borderRadius: '25px', padding: '0 40px', fontSize: '16px'}}
            onClick={() => Taro.navigateTo({url: '/pages/activity-list/index'})}
          >
            发现更多活动
          </Button>
        </>
      )}
    </View>
  )
}