import {Component} from 'react'
import {View, Text, Image} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {tabBarStore} from '../store/tabbar'

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
      this.setState({selected: selectedIndex})
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

    const {list} = this.state
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
    const {selected, list} = this.state

    return (
      <View className='custom-tab-bar'>
        <View className='tab-bar-backdrop'/>
        <View className='tab-bar-content'>
          {list.map((item, index) => (
            <View
              key={index}
              className={`tab-item ${selected === index ? 'selected' : ''}`}
              onClick={() => this.switchTab(index)}
            >
              <View className='tab-icon-container'>
                <View className='tab-icon-wrapper'>
                  <Image
                    src={selected === index ? item.activeIcon : item.icon}
                    className='tab-icon-image'
                    mode='aspectFit'
                  />
                  {selected === index && (
                    <View className='icon-bg-animation'/>
                  )}
                </View>
                {selected === index && (
                  <View className='tab-indicator'/>
                )}
              </View>
              <Text className='tab-text'>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }
}
