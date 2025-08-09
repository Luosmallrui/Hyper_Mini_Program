import { View, Image, Text } from '@tarojs/components';
import './index.less';

// 空状态图标，可替换成你项目里实际的图标路径，这里先空着，你填自己的
const EMPTY_ICON = '';

interface CooperationProps {}

const Cooperation: React.FC<CooperationProps> = () => {
  return (
    <View className="cooperation-page">
      <View className="empty-container">
        <Image className="empty-icon" src={EMPTY_ICON} mode="widthFix" />
        <Text className="empty-text">空空如也</Text>
      </View>
    </View>
  );
};

export default Cooperation;
