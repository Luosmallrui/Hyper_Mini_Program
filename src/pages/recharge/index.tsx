import Taro from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, Button, Input, RadioGroup, Radio, ScrollView } from '@tarojs/components';
import './index.less';

// 定义组件接收的 props（这里没有外部传参，所以是 {}，若有可扩展）
interface RechargeProps {}

// 函数组件写法，使用 useState 替代类组件的 state/setState
const Recharge: React.FC<RechargeProps> = () => {
  // 我的余额
  const [balance, setBalance] = useState(0);
  // 当前激活的 tab：'recharge'（账户充值） | 'commission'（佣金转入）
  const [activeTab, setActiveTab] = useState<'recharge' | 'commission'>('recharge');
  // 选中的充值金额
  const [selectedAmount, setSelectedAmount] = useState(50);
  // 自定义充值金额
  const [customAmount, setCustomAmount] = useState('');
  // 佣金总数（假设从接口获取，这里先写死，实际需请求接口）
  const [commissionAmount, setCommissionAmount] = useState(0);
  // 输入的转入佣金金额
  const [inputCommission, setInputCommission] = useState('');

  // 切换 tab
  const handleTabChange = (e: any) => {
    // RadioGroup 的 onChange 事件会传递 { detail: { value } }
    setActiveTab(e.detail.value);
  };

  // 选择充值金额
  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    // 选预设金额时，清空自定义输入
    setCustomAmount('');
  };

  // 输入自定义金额
  const handleCustomInput = (e: any) => {
    const value = e.detail.value;
    setCustomAmount(value);
  };

  // 输入佣金转入金额
  const handleCommissionInput = (e: any) => {
    const value = e.detail.value;
    setInputCommission(value);
  };

  // 立即充值（账户充值）
  const handleRecharge = async () => {
    const rechargeAmount = Number(customAmount) || selectedAmount;
    if (rechargeAmount <= 0) {
      Taro.showToast({ title: '请输入有效的充值金额', icon: 'none' });
      return;
    }

    // 1. 调用微信支付（这里仅示例，需结合真实支付 SDK 或接口）
    try {
      // 假设调用支付接口，传入 rechargeAmount
      const payRes = await Taro.requestPayment({
        timeStamp: '', // 真实支付需后端返回
        nonceStr: '',
        package: '',
        signType: 'MD5',
        paySign: '',
      });
      if (payRes.errMsg === 'requestPayment:ok') {
        // 2. 支付成功，更新余额
        setBalance(prev => prev + rechargeAmount);
        // 3. 记录充值记录（调用记录接口，传入类型、金额等）
        saveRechargeRecord('recharge', rechargeAmount);
        Taro.showToast({ title: '充值成功' });
      }
    } catch (err) {
      Taro.showToast({ title: '支付失败或取消', icon: 'none' });
    }
  };

  // 立即转入（佣金转入）
  const handleCommissionTransfer = () => {
    const transferAmount = Number(inputCommission);
    if (Number.isNaN(transferAmount) || transferAmount <= 0 || transferAmount > commissionAmount) {
      Taro.showToast({ title: '请输入有效的转入金额', icon: 'none' });
      return;
    }
    // 1. 更新余额和佣金
    setBalance(prev => prev + transferAmount);
    setCommissionAmount(prev => prev - transferAmount);
    setInputCommission('');
    // 2. 记录转入记录
    saveRechargeRecord('commission', transferAmount);
    Taro.showToast({ title: '转入成功' });
  };

  // 保存充值/转入记录（可封装为接口请求）
  const saveRechargeRecord = (type: 'recharge' | 'commission', amount: number) => {
    // 调用后端接口，传入 type（充值/佣金转入）、amount 等参数
    // 示例：Taro.request({ url: '/api/record', method: 'POST', data: { type, amount } })
    console.log('记录类型：', type, '，金额：', amount);
  };

  // 跳转充值记录
  const goRechargeRecord = () => {
    Taro.navigateTo({ url: '/pages/recharge-record/index' }); // 假设记录页路径
  };

  // 充值金额选项
  const rechargeAmounts = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

  return (
    <View className="recharge-page">
      {/* 余额展示 */}
      <View className="balance-header">
        <Text className="balance-title">我的余额</Text>
        <Text className="balance-value">¥{balance.toFixed(2)}</Text>
      </View>

      {/* Tab 切换 */}
      <View className="tab-bar">
        <RadioGroup onChange={handleTabChange}>
          <Radio className="tab-item" checked={activeTab === 'recharge'} value="recharge">账户充值</Radio>
          <Radio className="tab-item" checked={activeTab === 'commission'} value="commission">佣金转入</Radio>
        </RadioGroup>
      </View>

      {activeTab === 'recharge' ? (
        // 账户充值面板
        <View className="recharge-panel">
          <ScrollView className="amount-list" scrollX>
            {rechargeAmounts.map(amount => (
              <View
                key={amount}
                className={`amount-item ${selectedAmount === amount ? 'active' : ''}`}
                onClick={() => handleAmountSelect(amount)}
              >
                <Text>¥{amount}</Text>
              </View>
            ))}
          </ScrollView>
          <Input
            className="custom-input"
            placeholder="自定义金额"
            value={customAmount}
            onInput={handleCustomInput}
            type="number"
          />
          <Button className="recharge-btn" onClick={handleRecharge}>立即充值</Button>
        </View>
      ) : (
        // 佣金转入面板
        <View className="commission-panel">
          <Text className="commission-desc">当前佣金：¥{commissionAmount.toFixed(2)}</Text>
          <Input
            className="commission-input"
            placeholder="输入转入金额"
            value={inputCommission}
            onInput={handleCommissionInput}
            type="number"
          />
          <Button className="transfer-btn" onClick={handleCommissionTransfer}>立即转入</Button>
        </View>
      )}

      {/* 充值记录 */}
      <Text className="record-link" onClick={goRechargeRecord}>充值记录</Text>
    </View>
  );
};

export default Recharge;
