import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import './index.less';

// 空状态图标
const EMPTY_ICON = '';

interface SurveyItem {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: '进行中' | '已结束';
}

const SurveyList = () => {
  const [surveyList, setSurveyList] = useState<SurveyItem[]>([]);

  // 获取问卷列表
  const fetchSurveys = () => {
    Taro.request({
      url: '/api/surveys',
      method: 'GET',
    }).then((res) => {
      setSurveyList(res.data || []);
    });
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  // 跳转到问卷详情
  const goToSurveyDetail = (id: string) => {
    Taro.navigateTo({
      url: `/pages/survey/detail?id=${id}`,
    });
  };

  // 跳转到参与记录
  const goToRecords = () => {
    Taro.navigateTo({
      url: '/pages/survey/records',
    });
  };

  return (
    <View className="survey-page">
      {/* 顶部标题 */}
      <View className="header">
        <Text className="title">问卷调查</Text>
        <Button className="record-btn" onClick={goToRecords}>
          参与记录
        </Button>
      </View>

      {/* 内容区域 */}
      <ScrollView className="content" scrollY>
        {surveyList.length > 0 ? (
          // 有问卷数据
          <View className="survey-list">
            {surveyList.map((item) => (
              <View
                className={`survey-item ${item.status === '已结束' ? 'ended' : ''}`}
                key={item.id}
                onClick={() => goToSurveyDetail(item.id)}
              >
                <View className="item-header">
                  <Text className="item-title">{item.title}</Text>
                  <Text className="item-status">{item.status}</Text>
                </View>
                <Text className="item-desc">{item.description}</Text>
                <View className="item-time">
                  <Text>时间: {item.startTime} 至 {item.endTime}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          // 空状态
          <View className="empty-container">
            <Image className="empty-icon" src={EMPTY_ICON} mode="aspectFit" />
            <Text className="empty-text">~ 目前暂无可用的问卷调查 ~</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SurveyList;
