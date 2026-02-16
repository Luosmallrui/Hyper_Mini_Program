// types.ts - 可选的 TypeScript 类型定义文件
// 如果你想要更严格的类型检查，可以使用这个文件

/**
 * 地图标记点类型
 */
export interface MarkerType {
  id: number;
  latitude: number;
  longitude: number;
  width: number | string;
  height: number | string;
  iconPath: string;
  zIndex?: number;
  anchor?: {
    x: number;
    y: number;
  };
  callout?: {
    content: string;
    color: string;
    fontSize: number;
    bgColor: string;
    display: 'BYCLICK' | 'ALWAYS';
    textAlign: 'left' | 'right' | 'center';
    anchorX: number;
    anchorY: number;
    borderWidth: number;
    borderColor: string;
    padding?: number;
    borderRadius?: number;
  };
  label?: {
    content: string;
    color: string;
    fontSize: number;
    anchorX: number;
    anchorY: number;
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    bgColor: string;
    padding: number;
    textAlign: 'left' | 'right' | 'center';
  };
}

/**
 * 活动卡片数据类型
 */
export interface EventCardType {
  id: number;
  title: string;
  price: string;
  date: string;
  image: string;
  tags: string[];
  venue: {
    name: string;
    avatar: string;
    fans: string;
  };
}

/**
 * 如何使用这些类型：
 *
 * 1. 在组件中导入类型：
 * import { MarkerType, EventCardType } from './types';
 *
 * 2. 使用类型定义 state：
 * const [markers] = useState<MarkerType[]>([...]);
 *
 * 3. 替换 index.tsx 中的 `as any` 为具体类型
 */
