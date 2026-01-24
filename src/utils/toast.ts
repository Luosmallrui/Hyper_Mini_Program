
import Taro from "@tarojs/taro";

/**
 * @description: Toast
 * @param {*} title
 * @param {*} icon
 * @param {*} duration
 */
export const showToast = (title, icon: any = "none", duration = 2000) => {
  Taro.showToast({
    title,
    icon,
    duration,
  });
};
