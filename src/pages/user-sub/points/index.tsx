import { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { request } from '../../../utils/request';
import './index.scss';

interface PointRecord {
  id: string | number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  order_type?: string;
}

interface PointsData {
  balance: number;
  pending_count: number;
  pending_amount: number;
  records: PointRecord[];
}

export default function PointsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [pointsData, setPointsData] = useState<PointsData>({
    balance: 0,
    pending_count: 0,
    pending_amount: 0,
    records: []
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 加载积分数据
  useEffect(() => {
    loadPointsData();
    loadPointsRecords();
  }, []);

  // 当 tab 切换时重新加载
  useEffect(() => {
    setPage(1);
    setPointsData(prev => ({ ...prev, records: [] }));
    loadPointsRecords(1, activeTab);
  }, [activeTab]);

  // 加载积分余额和待入账信息
  const loadPointsData = async () => {
    try {
      const res = await request({
        url: '/api/v1/points/balance',
        method: 'GET'
      });

      if (res.data && res.data.code === 200) {
        setPointsData(prev => ({
          ...prev,
          balance: res.data.data.balance || 0,
          pending_count: res.data.data.pending_count || 0,
          pending_amount: res.data.data.pending_amount || 0
        }));
      }
    } catch (error) {
      console.error('加载积分余额失败:', error);
    }
  };

  // 加载积分明细
  const loadPointsRecords = async (pageNum: number = page, type: string = activeTab) => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await request({
        url: '/api/v1/points/records',
        method: 'GET',
        data: {
          page: pageNum,
          pageSize: 20,
          type: type === 'all' ? '' : type
        }
      });

      if (res.data && res.data.code === 200) {
        const newRecords = res.data.data.records || [];
        if (pageNum === 1) {
          setPointsData(prev => ({ ...prev, records: newRecords }));
        } else {
          setPointsData(prev => ({
            ...prev,
            records: [...prev.records, ...newRecords]
          }));
        }

        setHasMore(res.data.data.has_more || false);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('加载积分明细失败:', error);
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  };

  // 滚动到底部加载更多
  const handleScrollToLower = () => {
    if (hasMore && !loading) {
      loadPointsRecords(page + 1, activeTab);
    }
  };

  // 返回上一页
  const handleBack = () => {
    Taro.navigateBack();
  };

  // 格式化日期
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  // 格式化金额显示
  const formatAmount = (amount: number): string => {
    return amount >= 0 ? `+${amount}` : `${amount}`;
  };

  // 筛选记录
  const getFilteredRecords = (): PointRecord[] => {
    if (activeTab === 'all') {
      return pointsData.records;
    } else if (activeTab === 'income') {
      return pointsData.records.filter(r => r.amount > 0);
    } else {
      return pointsData.records.filter(r => r.amount < 0);
    }
  };

  const filteredRecords = getFilteredRecords();

  return (
    <View className="points-page">
      {/* 顶部导航栏 */}
      <View className="navbar">
        <View className="navbar-left" onClick={handleBack}>
          <Image
            className="back-icon"
            src={require('../../../assets/images/background.webp')}
            mode="aspectFit"
          />
        </View>
        <Text className="navbar-title">我的积分</Text>
        <View className="navbar-right">
          <Image
            className="more-icon"
            src={require('../../../assets/images/coin.png')}
            mode="aspectFit"
          />
        </View>
      </View>

      <ScrollView
        className="scroll-content"
        scrollY
        onScrollToLower={handleScrollToLower}
        lowerThreshold={100}
      >
        {/* 积分余额卡片 */}
        <View className="balance-card">
          <View className="balance-content">
            <Text className="balance-label">积分余额</Text>
            <Text className="balance-amount">{pointsData.balance.toFixed(1)}</Text>
            {pointsData.pending_count > 0 && (
              <View className="pending-info">
                <Text className="pending-text">
                  {pointsData.pending_count}笔订单 共{pointsData.pending_amount}分待入账
                </Text>
              </View>
            )}
          </View>
          <Image
            className="card-decoration"
            src="https://lanhu-oss-proxy.lanhuapp.com/SketchPng12b21fca23b24f33663f7787454508cd34d5ec97b4eb6a02d0fee58399560371"
            mode="aspectFit"
          />
        </View>

        {/* Tab 切换 */}
        <View className="records-container">
          <View className="tabs">
            <View
              className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Text className={`tab-text ${activeTab === 'all' ? 'active' : ''}`}>
                全部
              </Text>
            </View>
            <View
              className={`tab-item ${activeTab === 'income' ? 'active' : ''}`}
              onClick={() => setActiveTab('income')}
            >
              <Text className={`tab-text ${activeTab === 'income' ? 'active' : ''}`}>
                积分收入
              </Text>
            </View>
            <View
              className={`tab-item ${activeTab === 'expense' ? 'active' : ''}`}
              onClick={() => setActiveTab('expense')}
            >
              <Text className={`tab-text ${activeTab === 'expense' ? 'active' : ''}`}>
                积分支出
              </Text>
            </View>
          </View>

          {/* 积分明细列表 */}
          <View className="records-list">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, index) => (
                <View key={`${record.id}-${index}`} className="record-item">
                  <View className="record-info">
                    <Text className="record-desc">{record.description}</Text>
                    <Text className="record-time">
                      {record.amount > 0 ? '积分发放时间' : '积分使用时间'}{' '}
                      {formatDate(record.created_at)}
                    </Text>
                  </View>
                  <Text className={`record-amount ${record.amount > 0 ? 'income' : 'expense'}`}>
                    {formatAmount(record.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <View className="empty-state">
                <Text className="empty-text">暂无记录</Text>
              </View>
            )}

            {/* 加载更多提示 */}
            {loading && (
              <View className="loading-more">
                <Text className="loading-text">加载中...</Text>
              </View>
            )}

            {/* 没有更多数据提示 */}
            {!hasMore && filteredRecords.length > 0 && (
              <View className="no-more">
                <Text className="no-more-text">没有更多了</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 底部安全区 */}
      <View className="safe-area-bottom" />
    </View>
  );
}
