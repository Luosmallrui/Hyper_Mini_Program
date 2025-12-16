import Taro from "@tarojs/taro";

class TabBarStore {
  private selectedIndex: number = 0
  private listeners: Set<(index: number) => void> = new Set()

  setSelected(index: number) {
    if (this.selectedIndex !== index) {
      this.selectedIndex = index
      this.notifyListeners()
    }
  }

  getSelected(): number {
    return this.selectedIndex
  }

  subscribe(listener: (index: number) => void): () => void {
    this.listeners.add(listener)
    // 立即调用一次，确保组件获得当前状态
    listener(this.selectedIndex)

    // 返回取消订阅的函数
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.selectedIndex)
      } catch (error) {
        console.error('TabBar listener error:', error)
      }
    })
  }

  // 根据当前路由自动设置选中状态
  updateByCurrentRoute() {
    const routes = [
      '/pages/index/index',
      '/pages/discount/index',
      '/pages/cart/index',
      '/pages/user/index',
    ]

    try {
      // 使用类型断言避免 Taro 类型问题
      const pages = (Taro as any).getCurrentPages()
      if (pages && pages.length > 0) {
        const currentPage = pages[pages.length - 1]
        const currentRoute = '/' + currentPage.route
        const index = routes.indexOf(currentRoute)
        if (index !== -1) {
          this.setSelected(index)
        }
      }
    } catch (error) {
      console.error('获取当前路由失败:', error)
    }
  }
}

export const tabBarStore = new TabBarStore()

// 导出一个辅助函数用于在页面中设置选中状态
export const setTabBarIndex = (index: number) => {
  tabBarStore.setSelected(index)
}
