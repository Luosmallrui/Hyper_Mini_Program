import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.scss'

export default function ActivityAttendeePage() {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)

  const [name, setName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)
    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44)
  }, [])

  const canSubmit = name.trim() && idCard.trim() && phone.trim() && agreed

  return (
    <View className='attendee-page'>
      <View className='custom-nav' style={{ paddingTop: `${statusBarHeight}px`, height: `${navBarHeight}px` }}>
        <View className='nav-left' onClick={() => Taro.navigateBack()}>
          <AtIcon value='chevron-left' size='24' color='#fff' />
        </View>
        <View className='nav-title'>新增观演人</View>
      </View>

      <View className='form-body' style={{ paddingTop: `${statusBarHeight + navBarHeight}px` }}>
        <View className='field'>
          <Text className='label'>真实姓名</Text>
          <Input
            className='input'
            placeholder='请输入您的真实姓名'
            value={name}
            onInput={e => setName(e.detail.value)}
          />
        </View>

        <View className='field'>
          <Text className='label'>身份信息</Text>
          <Input
            className='input'
            placeholder='请输入您的身份证号'
            value={idCard}
            onInput={e => setIdCard(e.detail.value)}
          />
        </View>

        <View className='field'>
          <Text className='label'>手机号码</Text>
          <Input
            className='input'
            placeholder='请输入您的联系方式'
            value={phone}
            onInput={e => setPhone(e.detail.value)}
          />
        </View>

        <View className='agree-row' onClick={() => setAgreed(!agreed)}>
          <View className={`agree-dot ${agreed ? 'checked' : ''}`} />
          <Text className='agree-text'>请阅读并同意</Text>
          <Text className='agree-link'>《实名须知》</Text>
          <Text className='agree-text'>允许HYPER统一管理本人信息</Text>
        </View>
      </View>

      <View className='bottom-bar'>
        <View className={`submit-btn ${canSubmit ? 'active' : ''}`}>确认保存</View>
      </View>
    </View>
  )
}
