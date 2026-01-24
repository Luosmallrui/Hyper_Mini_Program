
import { proxy } from 'valtio'

const user: {
  name?: string
} = {
  name: 'Link',
}

export const store = proxy({
  user,
  setUser(name: string) {
    this.user.name = name; // 通过代理对象更新 name 属性
  },
})
