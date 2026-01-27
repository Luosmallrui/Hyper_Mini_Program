import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { AtIcon } from 'taro-ui';
import 'taro-ui/dist/style/components/icon.scss';
import './index.less';

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
  const { type = 'follower' } = router.params;

  const [list, setList] = useState<UserItem[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(type);
  const [navBarHeight, setNavBarHeight] = useState(44);
  const [statusBarHeight, setStatusBarHeight] = useState(20);

  // Tab 配置
  const tabs = [
    { key: 'follower', label: '粉丝' },
    { key: 'following', label: '关注' },
  ];

  const token = Taro.getStorageSync('access_token');

  useEffect(() => {
    resetAndLoad();
  }, [activeTab]);

  useDidShow(() => {
    resetAndLoad();
  });

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo();
    const menuInfo = Taro.getMenuButtonBoundingClientRect();
    const sbHeight = sysInfo.statusBarHeight || 20;
    setStatusBarHeight(sbHeight);
    const calculatedNavHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height;
    setNavBarHeight(Number.isNaN(calculatedNavHeight) ? 44 : calculatedNavHeight);
  }, []);

  const resetAndLoad = () => {
    setList([]);
    setCursor(0);
    setHasMore(true);
    loadData(0);
  };

  const loadData = async (currentCursor: number = cursor) => {
    if (loading) return;
    if (currentCursor > 0 && !hasMore) return;

    setLoading(true);

    try {
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/follow/list`,
        method: 'GET',
        data: {
          pageSize: 10,
          cursor: currentCursor,
          type: activeTab
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

        const newList: UserItem[] = following.map(item => ({
          id: String(item.user_id),
          avatar: item.avatar,
          nickname: item.nickname,
          signature: item.signature || '这个人很懒，什么都没有留下...',
          isFollowing: item.is_following,
          isMutual: item.is_mutual,
          followTime: item.follow_time
        }));

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

  const handleTabChange = (key: string) => {
    if (key === activeTab) return;
    setActiveTab(key);
  };

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
        setList(prevList =>
          prevList.map(item => {
            if (item.id === user.id) {
              const newIsFollowing = !item.isFollowing;
              return {
                ...item,
                isFollowing: newIsFollowing,
                isMutual: newIsFollowing ? item.isMutual : false
              };
            }
            return item;
          })
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

  const handleUserClick = (targetUserId: string) => {
    Taro.navigateTo({
      url: `/pages/user/profile/index?userId=${targetUserId}`
    });
  };

  const handleScrollToLower = () => {
    if (!loading && hasMore) {
      loadData(cursor);
    }
  };

  // ✅ 计算按钮文案和样式
  const getButtonConfig = (user: UserItem) => {
    if (activeTab === 'following') {
      // 关注列表：我关注的人
      if (user.isMutual) {
        return { text: '互相关注', className: 'btn-mutual' };
      } else {
        return { text: '已关注', className: 'btn-following' };
      }
    } else {
      // 粉丝列表：关注我的人
      if (user.isMutual) {
        return { text: '互相关注', className: 'btn-mutual' };
      } else {
        return { text: '回关', className: 'btn-follow' };
      }
    }
  };

  return (
    <View className="follow-list-page">
      {/* 自定义导航栏 */}
      <View className="custom-navbar" style={{ top: `${statusBarHeight}px`, height: `${navBarHeight}px` }}>
        <View className="navbar-content">
          <View
            className="back-button"
            onClick={() => Taro.navigateBack()}
          >
            <AtIcon value="chevron-left" size="22" color="#fff" />
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
        style={{
          height: `calc(100vh - ${statusBarHeight + navBarHeight}px)`,
          marginTop: `${statusBarHeight + navBarHeight}px`,
        }}
      >
        <View className="user-list">
          {list.map(user => {
            const buttonConfig = getButtonConfig(user);

            return (
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
                    {/* ✅ 去掉徽章，只显示昵称和签名 */}
                    <Text className="nickname">{user.nickname}</Text>
                    <Text className="signature">{user.signature}</Text>
                  </View>
                </View>

                {/* ✅ 按钮根据状态显示不同文案 */}
                <View className="action-btn">
                  <View
                    className={`btn ${buttonConfig.className}`}
                    onClick={() => handleFollowToggle(user)}
                  >
                    <Text className="btn-text">{buttonConfig.text}</Text>
                  </View>
                </View>
              </View>
            );
          })}

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
