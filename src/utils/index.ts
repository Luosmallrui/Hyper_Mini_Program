import Taro from '@tarojs/taro';

export { showToast } from './toast';
export { isLogin, cloneDeep, copyText, navigateJumpTo, switchTabTo, dateToChinese, moneyToThousands } from './utils';
export { appUpdate } from './app-update';

export interface IRequest {
  get<T = any>(url: string, params?: any): Promise<T>;
  post<T = any>(url: string, data?: any): Promise<T>;
}

export const request: IRequest = {
  get(url, params) {
    return Taro.request({
      url,
      data: params,
      method: 'GET',
    }).then(res => res.data as any);
  },

  post(url, data) {
    return Taro.request({
      url,
      data,
      method: 'POST',
    }).then(res => res.data as any);
  },
};
