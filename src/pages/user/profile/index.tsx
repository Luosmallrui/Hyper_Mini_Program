import React, {useState, useEffect} from 'react';
import {View, Text, Image, ScrollView} from '@tarojs/components';
import Taro, {useRouter} from '@tarojs/taro';
import {AtIcon} from 'taro-ui';
import './index.scss';

const BASE_URL = 'https://www.hypercn.cn';

interface UserProfile {
  user_id: string;
  nickname: string;
  avatar_url: string;
  signature: string;
  gender?: number; // 0-未知 1-男 2-女
  location?: string;
  ip_location?: string;
}

interface UserStats {
  following: number;
  follower: number;
  likes: number;
  notes?: number; // 笔记数
}

interface Note {
  note_id: string;
  cover: string;
  title: string;
  like_count: number;
}

const UserProfile: React.FC = () => {
  const router = useRouter();
  const {userId} = router.params;

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

  const token = Taro.getStorageSync('access_token');
  const myUserId = Taro.getStorageSync('userInfo')?.user_id;

  useEffect(() => {
    Taro.setNavigationBarTitle({
      title: userProfile?.nickname || '个人主页'
    })
    loadUserProfile();
    loadUserNotes();
  }, [userId]);

  // 加载用户资料
  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/user/info`,
        method: 'GET',
        data: {user_id: userId},
        header: {'Authorization': `Bearer ${token}`},
        dataType: 'string',
        responseType: 'text'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
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
      }
    } catch (error) {
      console.error('加载用户资料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载用户笔记
  const loadUserNotes = async () => {
    try {
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/user/note`,
        method: 'GET',
        data: {user_id: userId, page: 1, pageSize: 9},
        header: {'Authorization': `Bearer ${token}`},
        dataType: 'string',
        responseType: 'text'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
        }
      }

      if (resBody.code === 200 && resBody.data) {
        setNoteList(resBody.data.list || []);
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
    }
  };

  // 关注/取消关注
  const handleFollowToggle = async () => {
    try {
      const action = isFollowing ? 'unfollow' : 'follow';

      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/follow/${action}`,
        method: 'POST',
        data: {user_id: userId},
        header: {'Authorization': `Bearer ${token}`},
        dataType: 'string',
        responseType: 'text'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
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
      }
    } catch (error) {
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

  // 跳转到关注/粉丝列表
  const handleStatsClick = (type: string) => {
    if (type === 'likes') return;

    Taro.navigateTo({
      url: `/pages/user/follow-list/index?type=${type}&userId=${userId}`
    });
  };

  // 跳转到笔记详情
  const handleNoteClick = (noteId: string) => {
    Taro.navigateTo({
      url: `/pages/note/detail/index?noteId=${noteId}`
    });
  };

  // 是否是自己
  const isMe = myUserId && String(myUserId) === String(userId);

  if (loading) {
    return (
      <View className="user-profile-page loading-state">
        <Text className="loading-text">加载中...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View className="user-profile-page empty-state">
        <Text className="empty-text">用户不存在</Text>
      </View>
    );
  }

  return (
    <View className="user-profile-page">
      {/* 自定义导航栏 */}
      <View className="custom-navbar">
        <View className="navbar-content">
          {/*<View className="back-button" onClick={() => Taro.navigateBack()}>*/}
          {/*  <AtIcon value="chevron-left" size="24" color="#333"/>*/}
          {/*</View>*/}
          {/*<Text className="navbar-title">{userProfile.nickname}</Text>*/}
          <View className="navbar-right">
            <AtIcon value="ellipsis" size="1" color="#333"/>
          </View>
        </View>
      </View>

      <ScrollView className="scroll-view" scrollY>
        {/* 用户信息卡片 */}
        <View className="profile-header">
          <View className="user-info">
            <Image
              className="avatar"
              src={userProfile.avatar_url}
              mode="aspectFill"
            />

            <View className="info-content">
              <View className="name-row">
                <Text className="nickname">{userProfile.nickname}</Text>
                {userProfile.gender === 1 && (
                  <View className="gender-badge male">
                    <AtIcon value="user" size="12" color="#4A90E2"/>
                  </View>
                )}
                {userProfile.gender === 2 && (
                  <View className="gender-badge female">
                    <AtIcon value="user" size="12" color="#FF6B9D"/>
                  </View>
                )}
              </View>

              <Text className="user-id">小红书号: {userProfile.user_id}</Text>

              {userProfile.signature && (
                <Text className="signature">{userProfile.signature}</Text>
              )}

              {userProfile.ip_location && (
                <View className="location">
                  <AtIcon value="map-pin" size="14" color="#999"/>
                  <Text className="location-text">IP属地: {userProfile.ip_location}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 统计数据 */}
          <View className="stats-row">
            <View className="stat-item" onClick={() => handleStatsClick('following')}>
              <Text className="stat-value">{formatNumber(userStats.following)}</Text>
              <Text className="stat-label">关注</Text>
            </View>
            <View className="stat-item" onClick={() => handleStatsClick('follower')}>
              <Text className="stat-value">{formatNumber(userStats.follower)}</Text>
              <Text className="stat-label">粉丝</Text>
            </View>
            <View className="stat-item" onClick={() => handleStatsClick('likes')}>
              <Text className="stat-value">{formatNumber(userStats.likes)}</Text>
              <Text className="stat-label">获赞与收藏</Text>
            </View>
          </View>

          {/* 操作按钮 */}
          {!isMe && (
            <View className="action-buttons">
              <View
                className={`follow-btn ${isFollowing ? 'following' : ''}`}
                onClick={handleFollowToggle}
              >
                <Text className="btn-text">
                  {isFollowing ? '已关注' : '关注'}
                </Text>
              </View>
              <View className="message-btn">
                <AtIcon value="message" size="20" color="#333"/>
              </View>
            </View>
          )}
        </View>

        {/* Tab 导航 */}
        <View className="tabs-nav">
          <View className="tab-item active">
            <Text className="tab-text">笔记 {userStats.notes || 0}</Text>
            <View className="tab-indicator"/>
          </View>
          <View className="tab-item">
            <Text className="tab-text">收藏</Text>
          </View>
          <View className="tab-item">
            <Text className="tab-text">赞过</Text>
          </View>
        </View>

        {/* 笔记列表（瀑布流） */}
        <View className="notes-container">
          {noteList.length > 0 ? (
            <View className="notes-grid">
              {noteList.map(note => (
                <View
                  key={note.note_id}
                  className="note-card"
                  onClick={() => handleNoteClick(note.note_id)}
                >
                  <Image
                    className="note-cover"
                    src={note.cover}
                    mode="aspectFill"
                  />
                  <Text className="note-title">{note.title}</Text>
                  <View className="note-footer">
                    <View className="like-count">
                      <AtIcon value="heart" size="14" color="#999"/>
                      <Text className="count-text">{formatNumber(note.like_count)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="empty-notes">
              <Text className="empty-icon">📝</Text>
              <Text className="empty-text">
                {isMe ? '还没有发布笔记' : 'TA还没有发布笔记'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default UserProfile;
