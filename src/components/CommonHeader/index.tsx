import { View, Text, Image } from '@tarojs/components'
import { CSSProperties, ReactNode, memo } from 'react'
import { AtIcon } from 'taro-ui'
import 'taro-ui/dist/style/components/icon.scss'
import './index.less'

interface CommonHeaderProps {
  city?: string
  onSearchClick: () => void
  style?: CSSProperties
  positionMode?: 'absolute' | 'fixed'
  rightContent?: ReactNode
  className?: string
}

function CommonHeader(props: CommonHeaderProps) {
  const {
    city = '\u6210\u90FD',
    onSearchClick,
    style,
    positionMode = 'absolute',
    rightContent,
    className = '',
  } = props

  const rootClassName = `common-header common-header--${positionMode}${className ? ` ${className}` : ''}`

  return (
    <View className={rootClassName} style={style}>
      <View className='common-header__left'>
        <Text className='common-header__city'>{city}</Text>
        <AtIcon value='chevron-right' size='16' color='#fff' />
        <View className='common-header__search' onClick={onSearchClick}>
          <Image className='common-header__search-icon' src={require('../../assets/icons/search.svg')} mode='aspectFit' />
        </View>
      </View>

      <View className='common-header__logo-wrap'>
        <Image src={require('../../assets/images/hyper-icon.png')} mode='aspectFit' className='common-header__logo' />
      </View>

      {rightContent && <View className='common-header__right'>{rightContent}</View>}
    </View>
  )
}

export default memo(CommonHeader)
