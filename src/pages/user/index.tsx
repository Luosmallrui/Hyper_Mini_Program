import { AtIcon } from 'taro-ui';
import 'taro-ui/dist/style/index.scss';
import { useEffect, useState } from 'react';
import { View, Text, Button, Image, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { setTabBarIndex } from '../../store/tabbar';
import { request, saveTokens } from '../../utils/request';
import './index.scss';

const BASE_URL = 'https://www.hypercn.cn';

interface NoteMedia {
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
}

interface Note {
  id: string;
  title: string;
  content: string;
  media_data: NoteMedia[];
  type: number;
  created_at: string;
}

interface UserStats {
  following: number;
  follower: number;
  likes: number;
  notes: number;
}

const normalizeUserInfo = (user: any) => {
  if (!user || typeof user !== 'object') return {};
  const avatarUrl = user.avatar_url || user.avatar || user.headimgurl || user.head_img || '';
  return {
    ...user,
    avatar_url: avatarUrl
  };
};

export default function UserPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [userInfo, setUserInfo] = useState<any>({});
  const [userStats, setUserStats] = useState<UserStats>({
    following: 0,
    follower: 0,
    likes: 0,
    notes: 0
  });
  const [needPhoneAuth, setNeedPhoneAuth] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tempAvatar, setTempAvatar] = useState('');
  const [tempNickname, setTempNickname] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(20);
  const [navBarHeight, setNavBarHeight] = useState(44);
  const [noteList, setNoteList] = useState<Note[]>([]);
  const [cursor, setCursor] = useState<string>('');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'dynamic'>('activity');

  useEffect(() => {
    setTabBarIndex(4);
    Taro.eventCenter.trigger('TAB_SWITCH_LOADING', false);

    const sysInfo = Taro.getWindowInfo();
    const menuInfo = Taro.getMenuButtonBoundingClientRect();
    const sbHeight = sysInfo.statusBarHeight || 20;
    setStatusBarHeight(sbHeight);

    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height;
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44);

    const onUserUpdate = (u: any) => {
      const normalized = normalizeUserInfo(u);
      setUserInfo(normalized);
      setIsLogin(true);
      setNeedPhoneAuth(!normalized.phone_number);
    };
    Taro.eventCenter.on('USER_INFO_UPDATED', onUserUpdate);

    initLoginState();

    return () => {
      Taro.eventCenter.off('USER_INFO_UPDATED', onUserUpdate);
    };
  }, []);

  Taro.useDidShow(() => {
    setTabBarIndex(4);
    const accessToken = Taro.getStorageSync('access_token');
    if (accessToken) {
      fetchLatestUserInfo();
    }
  });

  useEffect(() => {
    if (isLogin) {
      loadMyNotes();
    }
  }, [isLogin]);

  const initLoginState = () => {
    const accessToken = Taro.getStorageSync('access_token');
    const cachedUser = Taro.getStorageSync('userInfo');

    if (accessToken) {
      if (cachedUser) {
        const normalizedCachedUser = normalizeUserInfo(cachedUser);
        setUserInfo(normalizedCachedUser);
        setIsLogin(true);
        setNeedPhoneAuth(!normalizedCachedUser.phone_number);
        Taro.setStorageSync('userInfo', normalizedCachedUser);
      }
      fetchLatestUserInfo();
    } else {
      handleLogin(true);
    }
  };

  const fetchLatestUserInfo = async () => {
    try {
      const res = await request({
        url: '/api/v1/user/info',
        method: 'GET'
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }

      if (resBody && resBody.code === 200 && resBody.data) {
        const { user, stats } = resBody.data;
        const normalizedUser = normalizeUserInfo(user);
        setUserInfo(normalizedUser);
        if (stats) {
          setUserStats(stats);
        }
        Taro.setStorageSync('userInfo', normalizedUser);
        Taro.eventCenter.trigger('USER_INFO_UPDATED', normalizedUser);
        setIsLogin(true);
        setNeedPhoneAuth(!normalizedUser.phone_number);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const loadMyNotes = async (isLoadMore: boolean = false) => {
    if (loading) return;
    if (isLoadMore && !hasMore) return;

    setLoading(true);

    try {
      const params: any = { pageSize: 20 };
      if (isLoadMore && cursor) {
        params.cursor = cursor;
      }

      const res = await request({
        url: '/api/v1/user/my-notes',
        method: 'GET',
        data: params
      });

      let resBody: any = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }

      if (resBody && resBody.code === 200 && resBody.data) {
        const { list, next_cursor, has_more } = resBody.data;
        if (isLoadMore) {
          setNoteList(prev => [...prev, ...list]);
        } else {
          setNoteList(list || []);
        }
        setCursor(next_cursor || '');
        setHasMore(has_more || false);
      } else {
        Taro.showToast({
          title: resBody?.msg || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Taro.removeStorageSync('access_token');
    Taro.removeStorageSync('refresh_token');
    Taro.removeStorageSync('userInfo');
    setIsLogin(false);
    setUserInfo({});
    setUserStats({ following: 0, follower: 0, likes: 0, notes: 0 });
    setNoteList([]);
    setCursor('');
    setHasMore(false);
  };

  const handleLogoutClick = () => {
    setTimeout(() => {
      Taro.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        confirmColor: '#FF2E4D',
        success: function (modalRes) {
          if (modalRes.confirm) {
            handleLogout();
          }
        }
      });
    }, 50);
  };

  const handleOpenSettings = () => {
    Taro.showActionSheet({
      itemList: ['退出登录'],
      success: res => {
        if (res.tapIndex === 0) {
          handleLogoutClick();
        }
      }
    });
  };

  const handleLogin = async (isSilent = false) => {
    if (!isSilent) Taro.showLoading({ title: '登录中...' });

    try {
      const loginRes = await Taro.login();
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/auth/wx-login`,
        method: 'POST',
        data: { code: loginRes.code }
      });

      if (!isSilent) Taro.hideLoading();

      let resBody = res.data;
      if (typeof resBody === 'string') {
        try {
          resBody = JSON.parse(resBody);
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }

      if (resBody && resBody.code === 200 && resBody.data) {
        const { access_token, refresh_token, access_expire } = resBody.data;
        Taro.setStorageSync('access_token', access_token);
        Taro.setStorageSync('refresh_token', refresh_token);
        saveTokens(access_token, refresh_token, access_expire);
        await fetchLatestUserInfo();
        if (!isSilent) {
          Taro.hideLoading();
          Taro.showToast({ title: '登录成功', icon: 'success' });
        }
      } else if (!isSilent) {
        Taro.hideLoading();
        const errorMsg = resBody?.msg || '登录失败';
        Taro.showToast({ title: errorMsg, icon: 'none' });
      }
    } catch (error) {
      if (!isSilent) {
        Taro.hideLoading();
        Taro.showToast({ title: '请求失败', icon: 'none' });
      }
      console.error('登录失败:', error);
    }
  };

  const onGetPhoneNumber = async (e: any) => {
    if (!e.detail?.code) return;
    Taro.showLoading({ title: '绑定中...' });

    try {
      const res = await request({
        url: '/api/v1/auth/bind-phone',
        method: 'POST',
        data: { phone_code: e.detail.code }
      });

      Taro.hideLoading();

      const resBody: any = res.data;
      if (resBody && resBody.code === 200) {
        Taro.showToast({ title: '绑定成功', icon: 'success' });
        fetchLatestUserInfo();
      } else {
        Taro.showToast({ title: resBody?.msg || '绑定失败', icon: 'none' });
      }
    } catch (error) {
      Taro.hideLoading();
      Taro.showToast({ title: '网络请求失败', icon: 'none' });
      console.error('绑定手机号失败:', error);
    }
  };

  const onChooseAvatar = (e: any) => {
    setTempAvatar(e.detail.avatarUrl);
  };

  const onNicknameBlur = (e: any) => {
    setTempNickname(e.detail.value);
  };

  const handleCloseModal = () => {
    setShowAuthModal(false);
  };

  const handleOpenEdit = () => {
    if (!isLogin) {
      handleLogin(false);
      return;
    }
    setTempAvatar(userInfo.avatar_url || '');
    setTempNickname(userInfo.nickname || '');
    setIsEditMode(true);
    setShowAuthModal(true);
  };

  const handleSubmitProfile = async () => {
    if (!tempNickname) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    Taro.showLoading({ title: '保存中...' });
    const accessToken = Taro.getStorageSync('access_token');

    try {
      let finalAvatarUrl = userInfo.avatar_url;
      const isNewImage =
        (tempAvatar.startsWith('http') && !tempAvatar.includes('mmbiz.qpic.cn')) ||
        tempAvatar.startsWith('wxfile');

      if (isNewImage) {
        const uploadRes = await Taro.uploadFile({
          url: `${BASE_URL}/api/v1/user/avatar`,
          filePath: tempAvatar,
          name: 'image',
          header: { Authorization: `Bearer ${accessToken}` }
        });

        let uploadData: any = {};
        try {
          uploadData = JSON.parse(uploadRes.data);
        } catch (e) {
          throw new Error('头像上传解析失败');
        }

        if (uploadData.code === 200) {
          finalAvatarUrl =
            typeof uploadData.data === 'string' ? uploadData.data : uploadData.data?.url;
        } else {
          throw new Error(uploadData.msg || '头像上传失败');
        }
      } else if (tempAvatar !== userInfo.avatar_url) {
        finalAvatarUrl = tempAvatar;
      }

      const updateRes = await request({
        url: '/api/v1/user/info',
        method: 'POST',
        data: { nickname: tempNickname, avatar: finalAvatarUrl }
      });

      Taro.hideLoading();

      const resBody: any = updateRes.data;
      if (resBody && resBody.code === 200) {
        setShowAuthModal(false);
        Taro.showToast({ title: '保存成功', icon: 'success' });
        fetchLatestUserInfo();
      } else {
        Taro.showToast({ title: resBody?.msg || '保存失败', icon: 'none' });
      }
    } catch (error: any) {
      Taro.hideLoading();
      Taro.showToast({ title: error.message || '操作失败', icon: 'none' });
      console.error('保存资料失败:', error);
    }
  };

  const formatNumber = (num: number | string): string => {
    if (num === '-') return '-';
    const value = Number(num);
    if (value >= 10000) {
      return (value / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return String(value);
  };

  const handleStatClick = (type: string | null) => {
    if (!isLogin || !hasData || !type) return;
    Taro.navigateTo({
      url: `/pages/user-sub/follow-list/index?type=${type}&userId=${userInfo.user_id || ''}`
    });
  };

  const handleNoteClick = (noteId: string) => {
    Taro.navigateTo({
      url: `/pages/square-sub/post-detail/index?id=${noteId}`
    });
  };

  // const handleViewAll = () => {
  //   Taro.navigateTo({
  //     url: `/pages/user-sub/profile/index?userId=${userInfo.user_id}`
  //   });
  // };

  const getNoteCover = (note: Note): string => {
    if (note.media_data && note.media_data.length > 0) {
      return note.media_data[0].thumbnail_url || note.media_data[0].url;
    }
    return '';
  };

  const calculateImageHeight = (media?: NoteMedia): number => {
    const containerWidth = (Taro.getSystemInfoSync().windowWidth - 64 - 12) / 2;
    if (!media || !media.width || !media.height) {
      return containerWidth;
    }
    const aspectRatio = media.height / media.width;
    const calculatedHeight = containerWidth * aspectRatio;
    return Math.min(Math.max(calculatedHeight, 200), 420);
  };

  const handleItemClick = (item: any) => {
    if (!isLogin) {
      handleLogin(false);
      return;
    }
    if (item.route) {
      Taro.navigateTo({ url: item.route });
    }
  };

  const hasData = isLogin || needPhoneAuth;
  const joinDate = userInfo?.created_at ? String(userInfo.created_at).split('T')[0] : '';

  const stats = [
    { label: '获赞/收藏', value: hasData ? userStats?.likes || 0 : '-', type: null },
    { label: '关注', value: hasData ? userStats?.following || 0 : '-', type: 'following' },
    { label: '粉丝', value: hasData ? userStats?.follower || 0 : '-', type: 'follower' }
  ];

  const mainNavItems = [
    {
      icon: require('../../assets/images/Order.png'),
      label: '订单',
      route: '/pages/order/index'
    },
    {
      icon: require('../../assets/images/Ticketing.png'),
      label: '票务'
    },
    {
      icon: require('../../assets/images/Points.png'),
      label: '积分',
      route: '/pages/user-sub/points/index'
    },
    {
      icon: require('../../assets/images/Account_Center.png'),
      label: '账号中心'
    },
    {
      icon: require('../../assets/images/Event_Organizing_Center.png'),
      label: '主办中心'
    }
  ];

  return (
    <ScrollView className="user-page" scrollY>
      <View className="top-bg">
        <Image
          className="top-bg-img"
          src={require('../../assets/images/backgound.png')}
          mode="scaleToFill"
        />
      </View>
      <View className="custom-nav-bar" style={{ height: `${statusBarHeight + navBarHeight}px` }}>
        <View style={{ height: `${statusBarHeight}px` }} />
        <View className="nav-bar-content" style={{ height: `${navBarHeight}px` }}>
          <View className="nav-side" />
          <View className="nav-center">
            <Image
              className="nav-logo"
              src={require('../../assets/images/hyper-icon.png')}
              mode="aspectFit"
            />
          </View>
          <View className="nav-side" />
        </View>
      </View>

      <View
        className="header-section"
        style={{
          marginTop: `${statusBarHeight + navBarHeight}px`
        }}
      >
        <View className="profile-card">
          <View className="avatar-wrapper">
            {hasData && userInfo.avatar_url ? (
              <Image className="avatar-img" src={userInfo.avatar_url} mode="aspectFill" />
            ) : (
              <View className="avatar-placeholder">
                <AtIcon value="user" size="30" color="#999" />
              </View>
            )}
            <View className="avatar-ring" />
          </View>

          <Text className="username">{hasData ? userInfo.nickname || '微信用户' : '未登录'}</Text>
          {!!joinDate && <Text className="join-text">{joinDate} 加入HYPER</Text>}

          <View className="stats-container">
            {stats.map((stat, index) => (
              <View
                key={index}
                className={`stat-item ${stat.type ? 'clickable' : ''}`}
                onClick={() => handleStatClick(stat.type)}
              >
                <Text className="stat-number">{formatNumber(stat.value)}</Text>
                <Text className="stat-label">{stat.label}</Text>
              </View>
            ))}
          </View>

          <View className="action-row">
            <View className="action-btn primary" onClick={handleOpenEdit}>
              {isLogin ? '编辑个人资料' : '去登录'}
            </View>
            <View className="action-btn ghost" onClick={handleOpenSettings}>
              设置
            </View>
          </View>
        </View>
      </View>

      <View className="main-nav-card">
        {mainNavItems.map((item, index) => (
          <View key={index} className="nav-item" onClick={() => handleItemClick(item)}>
            <Image className="nav-icon" src={item.icon} mode="aspectFit" />
            <Text className="nav-text">{item.label}</Text>
          </View>
        ))}
      </View>

      <View className="activity-tabs">
        <Text
          className={`tab-text ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          我的活动
        </Text>
        <Text
          className={`tab-text ${activeTab === 'dynamic' ? 'active' : ''}`}
          onClick={() => setActiveTab('dynamic')}
        >
          我的动态
        </Text>
      </View>

      {activeTab === 'activity' && (
        <View className="activity-card">
          <View className="activity-header">
            <Text className="activity-title active">我参加过的活动</Text>
            <View className="activity-divider" />
            <Text className="activity-title">我订阅的活动(18)</Text>
          </View>
          <ScrollView className="activity-scroll" scrollX enableFlex>
            {[1, 2, 3, 4].map(i => (
              <View key={i} className="activity-poster" />
            ))}
          </ScrollView>
        </View>
      )}

      {activeTab === 'dynamic' && (
        <View className="notes-section">
          {noteList.length > 0 ? (
            <View className="waterfall">
              <View className="waterfall-column">
                {noteList.filter((_, i) => i % 2 === 0).map(note => {
                  const media = note.media_data?.[0];
                  const imageHeight = calculateImageHeight(media);
                  return (
                    <View
                      key={String(note.id)}
                      className="note-card"
                      onClick={() => handleNoteClick(note.id)}
                    >
                      <Image
                        className="note-cover"
                        src={getNoteCover(note)}
                        mode="aspectFill"
                        style={{ height: `${imageHeight}px` }}
                      />
                      <Text className="note-title">{note.title}</Text>
                    </View>
                  );
                })}
              </View>
              <View className="waterfall-column">
                {noteList.filter((_, i) => i % 2 === 1).map(note => {
                  const media = note.media_data?.[0];
                  const imageHeight = calculateImageHeight(media);
                  return (
                    <View
                      key={String(note.id)}
                      className="note-card"
                      onClick={() => handleNoteClick(note.id)}
                    >
                      <Image
                        className="note-cover"
                        src={getNoteCover(note)}
                        mode="aspectFill"
                        style={{ height: `${imageHeight}px` }}
                      />
                      <Text className="note-title">{note.title}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View className="empty-state">
              <Text className="empty-icon">📝</Text>
              <Text className="empty-text">还没有发布动态</Text>
            </View>
          )}

          {loading && (
            <View className="loading-state">
              <Text className="loading-text">加载中...</Text>
            </View>
          )}
        </View>
      )}

      {showAuthModal && (
        <View className="auth-modal-overlay">
          <View className="auth-modal-content">
            <View className="close-icon" onClick={handleCloseModal}>
              <AtIcon value="close" size="20" color="#666" />
            </View>
            <Text className="modal-title">{isEditMode ? '编辑个人信息' : '完善个人信息'}</Text>
            <Text className="modal-subtitle">获取您的头像和昵称以展示</Text>

            <Button className="avatar-wrapper-btn" openType="chooseAvatar" onChooseAvatar={onChooseAvatar}>
              <Image className="chosen-avatar" src={tempAvatar} mode="aspectFill" />
              <View className="edit-badge">
                <AtIcon value="camera" size="12" color="#fff" />
              </View>
            </Button>

            <View className="input-group">
              <Text className="label">昵称</Text>
              <Input
                type="nickname"
                className="nickname-input"
                placeholder="请输入昵称"
                value={tempNickname}
                onBlur={onNicknameBlur}
                onInput={e => setTempNickname(e.detail.value)}
              />
            </View>

            <Button className="save-btn" onClick={handleSubmitProfile}>
              保存信息
            </Button>
          </View>
        </View>
      )}

      {needPhoneAuth && (
        <View className="phone-auth">
          <Button
            className="phone-btn"
            openType="getPhoneNumber"
            onGetPhoneNumber={onGetPhoneNumber}
          >
            绑定手机号
          </Button>
        </View>
      )}
    </ScrollView>
  );
}
