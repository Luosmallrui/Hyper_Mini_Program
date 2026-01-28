import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { AtIcon } from 'taro-ui';
import './index.less';

const BASE_URL = 'https://www.hypercn.cn';

interface UserProfile {
  user_id: string;
  nickname: string;
  avatar_url: string;
  signature: string;
  gender?: number;
  location?: string;
  ip_location?: string;
  created_at?: string;
}

interface UserStats {
  following: number;
  follower: number;
  likes: number;
  notes?: number;
}

interface Note {
  id: string | number; // 改为 string | number，兼容两种类型
  user_id: number;
  title: string;
  type: number;
  created_at: string;
  updated_at: string;
  media_data: {
    url: string;
    thumbnail_url: string;
    width: number;
    height: number;
    duration: number;
  };
  like_count: number;
  coll_count: number;
  share_count: number;
  comment_count: number;
  is_liked: boolean;
  is_collected: boolean;
  is_followed: boolean;
}

const UserProfilePage: React.FC = () => {
  const router = useRouter();
  const { userId } = router.params;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    following: 0,
    follower: 0,
    likes: 0,
    notes: 0
  });
  const [noteList, setNoteList] = useState<Note[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'dynamic'>('dynamic');
  const [cursor, setCursor] = useState<string>('');
  const [hasMore, setHasMore] = useState(false);
  const [navBarHeight, setNavBarHeight] = useState(44);
  const [statusBarHeight, setStatusBarHeight] = useState(20);

  const token = Taro.getStorageSync('access_token');
  const myUserId = Taro.getStorageSync('userInfo')?.user_id;

  useEffect(() => {
    if (userId) {
      loadUserProfile();
      loadUserNotes();
    }
  }, [userId]);

  useEffect(() => {
    const sysInfo = Taro.getWindowInfo();
    const menuInfo = Taro.getMenuButtonBoundingClientRect();
    const sbHeight = sysInfo.statusBarHeight || 20;
    setStatusBarHeight(sbHeight);
    const calculatedNavHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height;
    setNavBarHeight(Number.isNaN(calculatedNavHeight) ? 44 : calculatedNavHeight);
  }, []);

  // 加载用户资料
  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/user/info`,
        method: 'GET',
        data: { user_id: userId },
        header: { 'Authorization': `Bearer ${token}` },
        dataType: 'string',
        responseType: 'text'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }

      if (resBody.code === 200 && resBody.data) {
        setUserProfile(resBody.data.user);
        setUserStats(resBody.data.stats || {
          following: 0,
          follower: 0,
          likes: 0,
          notes: 0
        });
        setIsFollowing(resBody.data.is_following || false);
      } else {
        Taro.showToast({
          title: resBody.msg || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载用户资料失败:', error);
      Taro.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载用户笔记/动态
  const loadUserNotes = async (isLoadMore: boolean = false) => {
    // 如果正在加载更多，避免重复请求
    if (isLoadMore && loadingMore) return;

    if (isLoadMore) {
      setLoadingMore(true);
    }

    try {
      const params: any = {
        user_id: userId,
        pageSize: 20
      };

      // 如果是加载更多，则传入 cursor
      if (isLoadMore && cursor) {
        params.cursor = cursor;
      }

      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/user/note`,
        method: 'GET',
        data: params,
        header: { 'Authorization': `Bearer ${token}` },
        dataType: 'string', // 关键：设置为 string，避免 JSON 自动解析时丢失精度
        responseType: 'text'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          // 使用自定义解析，保留 id 为字符串
          resBody = JSON.parse(resBody, (key, value) => {
            // 如果是 id 字段且是大数字，保持为字符串
            if (key === 'id' && typeof value === 'number' && value > Number.MAX_SAFE_INTEGER) {
              return String(value);
            }
            return value;
          });
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }

      if (resBody.code === 200 && resBody.data) {
        const newNotes = resBody.data.notes || [];

        if (isLoadMore) {
          setNoteList(prev => [...prev, ...newNotes]);
        } else {
          setNoteList(newNotes);
        }

        // 更新分页信息
        setCursor(resBody.data.next_cursor || '');
        setHasMore(resBody.data.has_more || false);
      } else {
        Taro.showToast({
          title: resBody.msg || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      Taro.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      }
    }
  };

  // 关注/取消关注
  const handleFollowToggle = async () => {
    try {
      const action = isFollowing ? 'unfollow' : 'follow';

      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/follow/${action}`,
        method: 'POST',
        data: { user_id: userId },
        header: { 'Authorization': `Bearer ${token}` },
        dataType: 'string',
        responseType: 'text'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }

      if (resBody.code === 200) {
        setIsFollowing(!isFollowing);
        setUserStats(prev => ({
          ...prev,
          follower: isFollowing ? prev.follower - 1 : prev.follower + 1
        }));

        Taro.showToast({
          title: isFollowing ? '已取消关注' : '已关注',
          icon: 'success'
        });
      } else {
        Taro.showToast({
          title: resBody.msg || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('关注操作失败:', error);
      Taro.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return String(num);
  };

  // 计算图片显示高度（基于宽度和原始比例）
  const calculateImageHeight = (width: number, height: number): number => {
    const containerWidth = (Taro.getSystemInfoSync().windowWidth - 40) / 2; // 减去padding和gap
    const aspectRatio = height / width;
    const calculatedHeight = containerWidth * aspectRatio;

    // 限制高度在 200-400px 之间
    return Math.min(Math.max(calculatedHeight, 200), 400);
  };

  // 跳转到关注/粉丝列表
  const handleStatsClick = (type: string) => {
    if (type === 'likes') return;
    Taro.navigateTo({
      url: `/pages/user-sub/follow-list/index?type=${type}&userId=${userId}`
    });
  };

  // 跳转到笔记详情
  const handleNoteClick = (noteId: string | number) => {
    // 确保 noteId 是字符串
    const id = String(noteId);
    console.log('跳转到笔记详情, ID:', id);
    Taro.navigateTo({
      url: `/pages/square-sub/post-detail/index?id=${id}`
    });
  };

  // 返回上一页
  const handleBack = () => {
    Taro.navigateBack();
  };

  // 是否是自己
  const isMe = myUserId && String(myUserId) === String(userId);

  if (loading) {
    return (
      <View className="user-profile-page loading-state">
        <View className="loading-spinner" />
        <Text className="loading-text">加载中...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View className="user-profile-page empty-state">
        <Text className="empty-icon">😕</Text>
        <Text className="empty-text">用户不存在</Text>
      </View>
    );
  }

  return (
    <View className="user-profile-page">
      {/* 顶部导航栏 */}
      <View
        className="navbar"
        style={{ top: `${statusBarHeight}px`, height: `${navBarHeight}px` }}
      >
        <View className="navbar-left" onClick={handleBack}>
          <AtIcon value="chevron-left" size="24" color="#fff" />
        </View>
        <View className="navbar-center">
          <Image
            className="navbar-logo"
            src={require('../../../assets/images/hyper-icon.png')}
            mode="aspectFit"
          />
        </View>
        <View className="navbar-right" />
      </View>

      <ScrollView
        className="scroll-content"
        scrollY
        onScrollToLower={() => {
          if (hasMore && !loading) {
            loadUserNotes(true);
          }
        }}
        lowerThreshold={100}
      >
        {/* 头部背景区域 */}
        <View
          className="header-section"
          style={{
            backgroundImage: `url(${require('../../../assets/images/background.webp')})`,
          }}
        >

          {/* 用户头像卡片 */}
          <View className="profile-card">
            <View className="avatar-wrapper">
              <Image
                className="avatar"
                src={userProfile.avatar_url}
                mode="aspectFill"
              />
              <View className="avatar-ring" />
            </View>

            <Text className="username">{userProfile.nickname}</Text>

            {userProfile.created_at && (
              <View className="join-date">
                <Text className="join-text">
                  {userProfile.created_at.split('T')[0]} 加入HYPER
                </Text>
              </View>
            )}

            {/* 统计数据 */}
            <View className="stats-container">
              <View className="stat-item" onClick={() => handleStatsClick('likes')}>
                <Text className="stat-number">{formatNumber(userStats.likes)}</Text>
                <Text className="stat-label">获赞/收藏</Text>
              </View>
              <View className="stat-item" onClick={() => handleStatsClick('following')}>
                <Text className="stat-number">{formatNumber(userStats.following)}</Text>
                <Text className="stat-label">关注</Text>
              </View>
              <View className="stat-item" onClick={() => handleStatsClick('follower')}>
                <Text className="stat-number">{formatNumber(userStats.follower)}</Text>
                <Text className="stat-label">粉丝</Text>
              </View>
            </View>

            {/* 操作按钮 */}
            {!isMe && (
              <View className="action-row">
                <View
                  className={`follow-btn ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollowToggle}
                >
                  <Text className="btn-text">{isFollowing ? '已关注' : '关注'}</Text>
                </View>
                <View className="message-btn">
                  <Text className="btn-text">私信</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Tab 切换 */}
        <View className="tabs-section">
          <View
            className={`tab-item ${activeTab === 'activity' ? '' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Text className={`tab-text ${activeTab === 'activity' ? '' : 'inactive'}`}>
              他的活动
            </Text>
          </View>
          <View
            className={`tab-item ${activeTab === 'dynamic' ? 'active' : ''}`}
            onClick={() => setActiveTab('dynamic')}
          >
            <Text className={`tab-text ${activeTab === 'dynamic' ? 'active' : ''}`}>
              他的动态
            </Text>
          </View>
        </View>

        {/* 动态/笔记列表 - 瀑布流 */}
        <View className="notes-section">
          {noteList.length > 0 ? (
            <View className="waterfall-container">
              <View className="waterfall-column">
                {noteList.filter((_, i) => i % 2 === 0).map(note => {
                  const imageHeight = calculateImageHeight(
                    note.media_data.width,
                    note.media_data.height
                  );

                  return (
                    <View
                      key={String(note.id)}
                      className="note-card"
                      onClick={() => handleNoteClick(note.id)}
                    >
                      <Image
                        className="note-cover"
                        src={note.media_data.thumbnail_url || note.media_data.url}
                        mode="aspectFill"
                        style={{ height: `${imageHeight}px` }}
                      />
                      <View className="note-info">
                        <Text className="note-title">{note.title}</Text>
                        <View className="note-footer">
                          <View className="author-info">
                            <Image
                              className="author-avatar"
                              src={userProfile.avatar_url}
                              mode="aspectFill"
                            />
                            <Text className="author-name">{userProfile.nickname}</Text>
                          </View>
                          <View className="like-info">
                            <Image
                              className="like-icon"
                              src="https://lanhu-oss-proxy.lanhuapp.com/SketchPng56c4ed6e45b36ac80da5a57945656d859402021c84bb632895042bc45d1d384d"
                              mode="aspectFit"
                            />
                            <Text className="like-count">{formatNumber(note.like_count)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
              <View className="waterfall-column">
                {noteList.filter((_, i) => i % 2 === 1).map(note => {
                  const imageHeight = calculateImageHeight(
                    note.media_data.width,
                    note.media_data.height
                  );

                  return (
                    <View
                      key={String(note.id)}
                      className="note-card"
                      onClick={() => handleNoteClick(note.id)}
                    >
                      <Image
                        className="note-cover"
                        src={note.media_data.thumbnail_url || note.media_data.url}
                        mode="aspectFill"
                        style={{ height: `${imageHeight}px` }}
                      />
                      <View className="note-info">
                        <Text className="note-title">{note.title}</Text>
                        <View className="note-footer">
                          <View className="author-info">
                            <Image
                              className="author-avatar"
                              src={userProfile.avatar_url}
                              mode="aspectFill"
                            />
                            <Text className="author-name">{userProfile.nickname}</Text>
                          </View>
                          <View className="like-info">
                            <Image
                              className="like-icon"
                              src="https://lanhu-oss-proxy.lanhuapp.com/SketchPng5379aaf9ac689ec74e734de4db8beca5e1e59dfd9f6996e73d01dc59d51db754"
                              mode="aspectFit"
                            />
                            <Text className="like-count">{formatNumber(note.like_count)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View className="empty-notes">
              <Text className="empty-icon">📝</Text>
              <Text className="empty-text">
                {isMe ? '还没有发布动态' : 'TA还没有发布动态'}
              </Text>
            </View>
          )}

          {/* 加载更多提示 */}
          {loadingMore && (
            <View className="loading-more">
              <Text className="loading-more-text">加载中...</Text>
            </View>
          )}

          {/* 没有更多数据提示 */}
          {!hasMore && noteList.length > 0 && (
            <View className="no-more">
              <Text className="no-more-text">没有更多了</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 底部安全区 */}
      <View className="safe-area-bottom" />
    </View>
  );
};

export default UserProfilePage;
