import { Component } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { tabBarStore } from '../store/tabbar'

// 引入 SCSS 文件
import './index.scss'

interface TabItem {
  pagePath: string
  text: string
  iconType: string
  icon: string
  activeIcon: string
}

interface State {
  selected: number
  list: TabItem[]
}

export default class CustomTabBar extends Component<{}, State> {
  private unsubscribe: (() => void) | null = null

  constructor(props) {
    super(props)
    this.state = {
      selected: 0,
      list: [
        {
          pagePath: '/pages/index/index',
          text: '首页',
          iconType: 'home',
          icon: require('../assets/icons/home.png'),
          activeIcon: require('../assets/icons/home-active.png')
        },
        {
          pagePath: "/pages/discount/index",
          text: "广场",
          iconType: 'discount',
          icon: require('../assets/icons/discount.png'),
          activeIcon: require('../assets/icons/discount-active.png')
        },
        {
          pagePath: "/pages/cart/index",
          text: "消息",
          iconType: 'cart',
          icon: require('../assets/icons/cart.png'),
          activeIcon: require('../assets/icons/cart-active.png')
        },
        {
          pagePath: '/pages/user/index',
          text: '我的',
          iconType: 'user',
          icon: require('../assets/icons/home.png'),
          activeIcon: require('../assets/icons/home-active.png')
        },
      ]
    }
  }

  componentDidMount() {
    this.unsubscribe = tabBarStore.subscribe((selectedIndex) => {
      this.setState({ selected: selectedIndex })
    })
    tabBarStore.updateByCurrentRoute()
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }

  switchTab = (index: number) => {
    if (index === this.state.selected) {
      return
    }

    const { list } = this.state
    const url = list[index].pagePath

    tabBarStore.setSelected(index)

    Taro.switchTab({
      url,
      fail: (err) => {
        console.error('页面跳转失败:', err)
        tabBarStore.updateByCurrentRoute()
      }
    })
  }

  render() {
    const { selected, list } = this.state

    return (
      <View className='custom-tab-bar'>
        <View className='tab-bar-capsule'>
          {list.map((item, index) => {
            const isSelected = selected === index
            return (
              <View
                key={index}
                className={`tab-item ${isSelected ? 'active' : ''}`}
                onClick={() => this.switchTab(index)}
              >
                {/* 图标背景圆圈 */}
                <View className='icon-wrapper'>
                  <Image
                    src={isSelected ? item.activeIcon : item.icon}
                    className='tab-icon'
                    mode='aspectFit'
                  />
                </View>
                
                {/* 文字标签 */}
                <Text className='tab-text'>{item.text}</Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }
}