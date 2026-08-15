// 地图业态图标映射：key（标识）→ name（中文）→ url（CDN）
// key 和 name 可自行维护；url 由 scripts/upload-marker-icons.js 上传后生成
export interface MarkerIcon {
  key: string
  name: string
  url: string
}

export const MARKER_ICONS: MarkerIcon[] = [
  { key: 'chaopai', name: '潮牌', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589598551707648.png' },
  { key: 'chongwu', name: '宠物', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589596894957568.png' },
  { key: 'daka', name: '打卡', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597008203776.png' },
  { key: 'dianjing', name: '电竞', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589598778200064.png' },
  { key: 'diaoyu', name: '钓鱼', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599587700736.png' },
  { key: 'gaoerfu', name: '高尔夫', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589600065851392.png' },
  { key: 'gedou', name: '格斗:搏击', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597507325952.png' },
  { key: 'huaban', name: '滑板', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589598199386112.png' },
  { key: 'huaxue', name: '滑雪', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589598321020928.png' },
  { key: 'huodong', name: '活动', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597863841792.png' },
  { key: 'jiche', name: '机车', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597389885440.png' },
  { key: 'jianshen', name: '健身', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589595871547392.png' },
  { key: 'jiuba', name: '酒吧:场地', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599470260224.png' },
  { key: 'jubensha', name: '剧本杀:桌游', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589596429389824.png' },
  { key: 'juchang', name: '剧场', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589596316143616.png' },
  { key: 'kafei', name: '咖啡:奶茶', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589596781711360.png' },
  { key: 'kadingche', name: '卡丁车', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589596551024640.png' },
  { key: 'lanqiu', name: '篮球', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589598891446272.png' },
  { key: 'lifa', name: '理发', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589598669148160.png' },
  { key: 'luying', name: '露营', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599717724160.png' },
  { key: 'paizhao', name: '拍照', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597129838592.png' },
  { key: 'paidui', name: '派对', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597972893696.png' },
  { key: 'panyan', name: '攀岩', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597264056320.png' },
  { key: 'qixing', name: '骑行', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599952605184.png' },
  { key: 'qipai', name: '棋牌', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597624766464.png' },
  { key: 'qiche', name: '汽车', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589597750595584.png' },
  { key: 'taiqiu', name: '台球', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589596668465152.png' },
  { key: 'wangqiu', name: '网球', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599122132992.png' },
  { key: 'wenshen', name: '纹身', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599008886784.png' },
  { key: 'yanchu', name: '演出', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589598434267136.png' },
  { key: 'yinyue', name: '音乐', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599839358976.png' },
  { key: 'youyong', name: '游泳', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589598081945600.png' },
  { key: 'yumaoqiu', name: '羽毛球', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599247962112.png' },
  { key: 'zuqiu', name: '足球', url: 'https://cdn.hypercn.cn/ticketing/misc/2026/08/15/2088589599357014016.png' },
]

export const getMarkerIconUrl = (key?: string): string => {
  if (!key) return ''
  return MARKER_ICONS.find((item) => item.key === key)?.url || ''
}

export const getMarkerIconName = (key?: string): string => {
  if (!key) return ''
  return MARKER_ICONS.find((item) => item.key === key)?.name || ''
}
