import { Component } from 'react'
import { View, Image, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { tabBarStore } from '../store/tabbar'
import './index.scss'

interface TabItem {
  pagePath: string
  iconPath?: string 
  selectedIconPath?: string
  iconName?: string 
  isSpecial?: boolean 
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
          iconPath: require('../assets/icons/home.svg'),
          selectedIconPath: require('../assets/icons/home-active.svg'),
        },
        {
          pagePath: "/pages/square/index",
          iconPath: require('../assets/icons/stream.svg'),
          selectedIconPath: require('../assets/icons/stream-active.svg'),
        },
        {
          // 中间特殊按钮
          pagePath: "/pages/square/post-create/index", 
          isSpecial: true 
        },
        {
          pagePath: "/pages/message/index",
          iconPath: require('../assets/icons/message.svg'),
          selectedIconPath: require('../assets/icons/message-active.svg'),
        },
        {
          pagePath: '/pages/user/index',
          iconPath: require('../assets/icons/user.svg'),
          selectedIconPath: require('../assets/icons/user-active.svg'),
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

  handleSpecialClick = async (item: TabItem) => {
    try {
      const res = await Taro.chooseMedia({
        count: 9,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })

      const tempPaths = res.tempFiles.map(file => file.tempFilePath)
      if (tempPaths.length === 0) return

      Taro.setStorageSync('post_create_media', tempPaths)
      Taro.navigateTo({ url: item.pagePath })
    } catch (e) {
      console.log('cancel choose image')
    }
  }

  handleTabClick = (index: number, item: TabItem) => {
    if (item.isSpecial) {
      this.handleSpecialClick(item)
      return
    }

    if (index === this.state.selected) return

    tabBarStore.setSelected(index)
    Taro.switchTab({
      url: item.pagePath,
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
        <View className='tab-bar-container'>
          {list.map((item, index) => {
            const isSelected = selected === index
            const isSpecial = item.isSpecial || false

            return (
              <View
                key={index}
                className={`tab-item ${isSelected ? 'active' : ''} ${isSpecial ? 'special-item' : ''}`}
                onClick={() => this.handleTabClick(index, item)}
              >
                <View className='icon-wrapper'>
                  {isSpecial ? (
                    // 修改点：直接使用 Text 渲染 + 号
                    <Text className='tab-text-plus'>+</Text>
                  ) : (
                    <Image
                      src={isSelected ? item.selectedIconPath! : item.iconPath!}
                      className='tab-icon-image'
                      mode='aspectFit'
                    />
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </View>
    )
  }
}
