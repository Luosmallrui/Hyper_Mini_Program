import Taro from '@tarojs/taro'

const TAB_BAR_HEIGHT = 80
const TAB_BAR_PADDING_BOTTOM = 30

export const getCustomTabBarHeight = () => {
  const sysInfo = Taro.getWindowInfo()
  const safeAreaInsetsBottom = (sysInfo as any).safeAreaInsets?.bottom
  const safeAreaBottom = sysInfo.safeArea ? (sysInfo.screenHeight - sysInfo.safeArea.bottom) : 0
  const bottomInset = typeof safeAreaInsetsBottom === 'number' ? safeAreaInsetsBottom : safeAreaBottom
  return TAB_BAR_HEIGHT + TAB_BAR_PADDING_BOTTOM + (bottomInset || 0)
}

export const getCustomTabBarPadding = (extra = 0) => {
  return getCustomTabBarHeight() + extra
}
