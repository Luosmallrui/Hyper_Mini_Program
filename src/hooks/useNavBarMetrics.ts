import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'

interface NavBarMetrics {
  statusBarHeight: number
  navBarHeight: number
}

export function useNavBarMetrics(): NavBarMetrics {
  const [statusBarHeight, setStatusBarHeight] = useState(20)
  const [navBarHeight, setNavBarHeight] = useState(44)

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo()
    const menuInfo = Taro.getMenuButtonBoundingClientRect()
    const sbHeight = sysInfo.statusBarHeight || 20
    setStatusBarHeight(sbHeight)

    const calculatedNavHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height
    setNavBarHeight(Number.isNaN(calculatedNavHeight) ? 44 : calculatedNavHeight)
  }, [])

  return { statusBarHeight, navBarHeight }
}

