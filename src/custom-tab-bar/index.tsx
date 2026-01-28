import { Component } from 'react'
import { View, Image } from '@tarojs/components'
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
  indicatorOffset: number
}

export default class CustomTabBar extends Component<{}, State> {
  private unsubscribe: (() => void) | null = null
  private readonly tabUnits = [1, 1, 1.5, 1, 1]
  private readonly tabPaddingRpx = 20
  private readonly pillWidthRpx = 100

  constructor(props) {
    super(props)
    this.state = {
      selected: tabBarStore.getSelected(),
      indicatorOffset: this.getIndicatorOffset(tabBarStore.getSelected()),
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
          pagePath: "/pages/square-sub/post-create/index",
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
      this.setState({
        selected: selectedIndex,
        indicatorOffset: this.getIndicatorOffset(selectedIndex),
      })
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

  getIndicatorOffset = (index: number) => {
    const totalUnits = this.tabUnits.reduce((sum, unit) => sum + unit, 0)
    const containerWidthRpx = 750 - this.tabPaddingRpx * 2
    const unitWidthRpx = containerWidthRpx / totalUnits
    const unitsBefore = this.tabUnits.slice(0, index).reduce((sum, unit) => sum + unit, 0)
    const centerRpx = this.tabPaddingRpx + unitWidthRpx * (unitsBefore + this.tabUnits[index] / 2)
    return centerRpx - this.pillWidthRpx / 2
  }

  render() {
    const { selected, list, indicatorOffset } = this.state

    return (
      <View className='custom-tab-bar'>
        <View className='tab-bar-container'>
          <View
            className='tab-active-pill'
            style={{ transform: `translate3d(${indicatorOffset}rpx, -50%, 0)` }}
          />
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
                    <Image
                      src={require('../assets/images/lightning.png')}
                      className='tab-icon-image tab-icon-special'
                      mode='aspectFit'
                    />
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
