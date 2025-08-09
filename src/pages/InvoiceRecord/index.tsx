import Taro from '@tarojs/taro';
import { FC } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import './index.less'; // 或引入 SCSS 文件 './InvoiceRecord.scss'

// 空状态图标（可替换为实际项目的图标）
const EMPTY_ICON = '';

const InvoiceRecord: FC = () => {
  // 申请开发票回调（可扩展为跳转发票申请页）
  const handleApplyInvoice = () => {
    Taro.showToast({
      title: '前往申请发票',
      icon: 'none',
    });
    // 实际可跳转：Taro.navigateTo({ url: '/pages/invoice-apply/index' });
  };

  return (
    <View className="invoice-record-page">
      {/* 空状态区域 */}
      <View className="empty-container">
        <Image className="empty-icon" src={EMPTY_ICON} mode="widthFix" />
        <Text className="empty-text">~ 您还没有申请发票记录 ~</Text>
      </View>

      {/* 申请按钮 */}
      <Button className="apply-btn" onClick={handleApplyInvoice}>
        申请开具发票
      </Button>
    </View>
  );
};

export default InvoiceRecord;
