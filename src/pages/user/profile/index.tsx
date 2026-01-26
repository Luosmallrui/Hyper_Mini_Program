import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { AtIcon } from 'taro-ui';
import './index.scss';

const BASE_URL = 'https://www.hypercn.cn';

interface UserProfile {
  user_id: string;
  nickname: string;
  avatar_url: string;
  signature: string;
  gender?: number;
  location?: string;
  ip_location?: string;
  join_date?: string;
}

interface UserStats {
  following: number;
  follower: number;
  likes: number;
  notes?: number;
}

interface Note {
  note_id: string;
  cover: string;
  title: string;
  like_count: number;
  author_avatar?: string;
  author_name?: string;
}

const UserProfilePage: React.FC = () => {
  const router = useRouter();
  const { userId } = router.params;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    following: 12,
    follower: 48,
    likes: 12,
    notes: 0
  });
  const [noteList, setNoteList] = useState<Note[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'dynamic'>('dynamic');

  const token = Taro.getStorageSync('access_token');
  const myUserId = Taro.getStorageSync('userInfo')?.user_id;

  // 模拟数据 - 实际使用时从接口获取
  const mockUserProfile: UserProfile = {
    user_id: 'Hyper14076729928',
    nickname: 'Hyper14076729928',
    avatar_url: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/0c4dd0045b5c4630b47d7e60726341cb_mergeImage.png',
    signature: '',
    join_date: '2025-09-12'
  };

  const mockNotes: Note[] = [
    {
      note_id: '1',
      cover: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/2a899dd81faf4032bb6be8419d3833e6_mergeImage.png',
      title: '我来自祖安，想带你尝尝微光❤️',
      like_count: 1014,
      author_avatar: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/68b2dc1aa7fc4f538f0d31970500c074_mergeImage.png',
      author_name: '小蝴蝶不谈恋爱'
    },
    {
      note_id: '2',
      cover: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/7335858173e442269d23e2f73c6ecd24_mergeImage.png',
      title: '泳池派对｜原来你跟谁玩都那么开心我讨厌你😭',
      like_count: 2301,
      author_avatar: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/3b5965a03bb641d395ffac51d0755c06_mergeImage.png',
      author_name: '倩十三三'
    },
    {
      note_id: '3',
      cover: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/04daae7c23c647658e3673223368bd4a_mergeImage.png',
      title: '夏日清凉穿搭分享',
      like_count: 856,
      author_avatar: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/68b2dc1aa7fc4f538f0d31970500c074_mergeImage.png',
      author_name: '时尚博主'
    },
    {
      note_id: '4',
      cover: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/77caebfa17444f1eac83488c26afe703_mergeImage.png',
      title: '周末好去处推荐',
      like_count: 1523,
      author_avatar: 'https://lanhu-dds-backend.oss-cn-beijing.aliyuncs.com/merge_image/imgs/3b5965a03bb641d395ffac51d0755c06_mergeImage.png',
      author_name: '旅行达人'
    }
  ];

  useEffect(() => {
    // 使用模拟数据
    setUserProfile(mockUserProfile);
    setNoteList(mockNotes);
    setLoading(false);

    // 实际使用时取消注释以下代码
    // loadUserProfile();
    // loadUserNotes();
  }, [userId]);

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
        } catch (e) {}
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

  // 加载用户笔记/动态
  const loadUserNotes = async () => {
    try {
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/user/note`,
        method: 'GET',
        data: { user_id: userId, page: 1, pageSize: 9 },
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
        data: { user_id: userId },
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
      <View className="navbar">
        <View className="navbar-left" onClick={handleBack}>
          <AtIcon value="chevron-left" size="24" color="#fff" />
        </View>
        <View className="navbar-center">
          <Image
            className="navbar-logo"
            src="https://lanhu-oss-proxy.lanhuapp.com/SketchPngc3eeec34d6dfe9f2731cad3de1301c2a31831d7d48d7a8257a693589efb598ca"
            mode="aspectFit"
          />
        </View>
        <View className="navbar-right">
          <AtIcon value="menu" size="20" color="#fff" />
        </View>
      </View>

      <ScrollView className="scroll-content" scrollY>
        {/* 头部背景区域 */}
        <View className="header-section">
          {/* 背景装饰 */}
          <View className="header-bg">
            <View className="bg-decoration bg-decoration-1" />
            <View className="bg-decoration bg-decoration-2" />
          </View>

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

            {userProfile.join_date && (
              <View className="join-date">
                <Text className="join-text">{userProfile.join_date} 加入HYPER</Text>
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
                {noteList.filter((_, i) => i % 2 === 0).map(note => (
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
                    <View className="note-info">
                      <Text className="note-title">{note.title}</Text>
                      <View className="note-footer">
                        <View className="author-info">
                          <Image
                            className="author-avatar"
                            src={note.author_avatar || userProfile.avatar_url}
                            mode="aspectFill"
                          />
                          <Text className="author-name">{note.author_name || userProfile.nickname}</Text>
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
                ))}
              </View>
              <View className="waterfall-column">
                {noteList.filter((_, i) => i % 2 === 1).map(note => (
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
                    <View className="note-info">
                      <Text className="note-title">{note.title}</Text>
                      <View className="note-footer">
                        <View className="author-info">
                          <Image
                            className="author-avatar"
                            src={note.author_avatar || userProfile.avatar_url}
                            mode="aspectFill"
                          />
                          <Text className="author-name">{note.author_name || userProfile.nickname}</Text>
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
                ))}
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
        </View>
      </ScrollView>

      {/* 底部安全区 */}
      <View className="safe-area-bottom" />
    </View>
  );
};

export default UserProfilePage;
