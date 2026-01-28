import Taro from '@tarojs/taro'

const TAB_BAR_HEIGHT = 80
const TAB_BAR_PADDING_BOTTOM = 30

export const getCustomTabBarHeight = () => {
  const sysInfo = Taro.getWindowInfo()
  const safeAreaBottom = sysInfo.safeArea ? (sysInfo.screenHeight - sysInfo.safeArea.bottom) : 0
  return TAB_BAR_HEIGHT + TAB_BAR_PADDING_BOTTOM + safeAreaBottom
}

export const getCustomTabBarPadding = (extra = 0) => {
  return getCustomTabBarHeight() + extra
}
