import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import './index.scss';

const BASE_URL = 'https://www.hypercn.cn';

interface UserItem {
  id: string;
  avatar: string;
  nickname: string;
  signature: string;
  isFollowing: boolean;
  isMutual?: boolean;
  followTime?: string;
}

const FollowList: React.FC = () => {
  const router = useRouter();
  const { type = 'follower',  } = router.params;

  const [list, setList] = useState<UserItem[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(type);

  // Tab 配置
  const tabs = [
    { key: 'follower', label: '粉丝' },
    { key: 'following', label: '关注' },
  ];

  const token = Taro.getStorageSync('access_token');

  // ✅ 修复1: 使用 useEffect 而不是 useDidShow，避免重复加载
  useEffect(() => {
    // 重置状态并加载数据
    resetAndLoad();
  }, [activeTab]);

  useDidShow(() => {
    // 页面显示时刷新数据
    resetAndLoad();
  });

  // ✅ 修复2: 添加重置并加载的函数
  const resetAndLoad = () => {
    setList([]);
    setCursor(0);
    setHasMore(true);
    loadData(0); // 从头开始加载
  };

  // ✅ 修复3: loadData 接收 cursor 参数，避免状态更新延迟
  const loadData = async (currentCursor: number = cursor) => {
    if (loading) return;

    // ✅ 修复4: 只有在非首次加载时才检查 hasMore
    if (currentCursor > 0 && !hasMore) return;

    setLoading(true);

    try {
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/follow/list`,
        method: 'GET',
        data: {
          pageSize: 10,
          cursor: currentCursor,
          type: activeTab // ✅ 修复5: 传递 type 参数
        },
        header: { 'Authorization': `Bearer ${token}` },
        dataType: 'string',
        responseType: 'text'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
          throw new Error('数据解析失败');
        }
      }

      if (resBody.code === 200) {
        const { following, next_cursor, has_more } = resBody.data;

        // 映射数据
        const newList: UserItem[] = following.map(item => ({
          id: String(item.user_id),
          avatar: item.avatar,
          nickname: item.nickname,
          signature: item.signature || '这个人很懒，什么都没有留下...',
          isFollowing: item.is_following,
          isMutual: item.is_mutual,
          followTime: item.follow_time
        }));

        // ✅ 修复6: 根据 currentCursor 判断是替换还是追加
        setList(prev => currentCursor === 0 ? newList : [...prev, ...newList]);
        setCursor(next_cursor);
        setHasMore(has_more);
      } else {
        throw new Error(resBody.msg || '加载失败');
      }
    } catch (error: any) {
      console.error('加载失败:', error);
      Taro.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ 修复7: 切换 Tab 时更新 activeTab，触发 useEffect
  const handleTabChange = (key: string) => {
    if (key === activeTab) return; // 避免重复点击
    setActiveTab(key);
  };

  // ✅ 修复8: 完善关注/取消关注逻辑
  const handleFollowToggle = async (user: UserItem) => {
    try {
      const action = user.isFollowing ? 'unfollow' : 'follow';

      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/follow/${action}`,
        method: 'POST',
        data: { user_id: user.id },
        header: { 'Authorization': `Bearer ${token}` },
        dataType: 'string',
        responseType: 'text'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {}
      }

      if (resBody.code === 200) {
        // 更新本地状态
        setList(prevList =>
          prevList.map(item =>
            item.id === user.id
              ? { ...item, isFollowing: !item.isFollowing }
              : item
          )
        );

        Taro.showToast({
          title: user.isFollowing ? '已取消关注' : '已关注',
          icon: 'success',
        });
      } else {
        throw new Error(resBody.msg || '操作失败');
      }
    } catch (error: any) {
      Taro.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  };

  // 跳转到用户主页
  const handleUserClick = (targetUserId: string) => {
    Taro.navigateTo({
      url: `/pages/user/profile/index?userId=${targetUserId}`
    });
  };

  // ✅ 修复9: 滚动到底部加载更多
  const handleScrollToLower = () => {
    if (!loading && hasMore) {
      loadData(cursor);
    }
  };

  return (
    <View className="follow-list-page">
      {/* 自定义导航栏 */}
      <View className="custom-navbar">
        <View className="navbar-content">
          <View
            className="back-button"
            onClick={() => Taro.navigateBack()}
          >
            <Text className="icon-back">←</Text>
          </View>

          <View className="tabs">
            {tabs.map(tab => (
              <View
                key={tab.key}
                className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                <Text className="tab-text">{tab.label}</Text>
                {activeTab === tab.key && <View className="tab-indicator" />}
              </View>
            ))}
          </View>

          <View className="navbar-right" />
        </View>
      </View>

      {/* 列表内容 */}
      <ScrollView
        className="scroll-view"
        scrollY
        enableBackToTop
        onScrollToLower={handleScrollToLower}
      >
        <View className="user-list">
          {list.map(user => (
            <View key={user.id} className="user-item">
              <View
                className="user-info"
                onClick={() => handleUserClick(user.id)}
              >
                <Image
                  className="avatar"
                  src={user.avatar}
                  mode="aspectFill"
                />
                <View className="info-content">
                  <View className="nickname-row">
                    <Text className="nickname">{user.nickname}</Text>
                    {user.isMutual && (
                      <View className="mutual-badge">
                        <Text className="mutual-text">互相关注</Text>
                      </View>
                    )}
                  </View>
                  <Text className="signature">{user.signature}</Text>
                </View>
              </View>

              <View className="action-btn">
                {activeTab === 'following' ? (
                  <View
                    className={`btn ${user.isFollowing ? 'btn-following' : 'btn-follow'}`}
                    onClick={() => handleFollowToggle(user)}
                  >
                    <Text className="btn-text">
                      {user.isFollowing ? '已关注' : '关注'}
                    </Text>
                  </View>
                ) : (
                  <View
                    className={`btn ${user.isFollowing ? 'btn-following' : 'btn-follow'}`}
                    onClick={() => handleFollowToggle(user)}
                  >
                    <Text className="btn-text">
                      {user.isFollowing ? '互相关注' : '回关'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* 加载状态 */}
          {loading && (
            <View className="loading-more">
              <Text className="loading-text">加载中...</Text>
            </View>
          )}

          {/* 没有更多 */}
          {!hasMore && list.length > 0 && (
            <View className="no-more">
              <Text className="no-more-text">没有更多了</Text>
            </View>
          )}

          {/* 空状态 */}
          {!loading && list.length === 0 && (
            <View className="empty-state">
              <Text className="empty-icon">📭</Text>
              <Text className="empty-text">
                {activeTab === 'following' ? '还没有关注任何人' : '还没有粉丝'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default FollowList;
