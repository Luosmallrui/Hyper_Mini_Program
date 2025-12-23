import { Component } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
// 务必引入 icon 样式，否则图标无法显示
import 'taro-ui/dist/style/components/icon.scss' 
import { tabBarStore } from '../store/tabbar'

// 引入 SCSS 文件
import './index.scss'

interface TabItem {
  pagePath: string
  text: string
  iconName: string
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
          iconName: 'home' 
        },
        {
          pagePath: "/pages/square/index",
          text: "广场",
          iconName: 'streaming'
        },
        {
          pagePath: "/pages/message/index",
          text: "消息",
          iconName: 'message'
        },
        {
          pagePath: '/pages/user/index',
          text: '我的',
          iconName: 'user'
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
                <View className='icon-wrapper'>
                  {/* 这里把 size 改为 30，作为默认基准 */}
                  <AtIcon 
                    value={item.iconName} 
                    size='30' 
                    className='tab-at-icon' 
                  />
                </View>
                <Text className='tab-text'>{item.text}</Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }
}