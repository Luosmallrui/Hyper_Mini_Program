import { AtIcon } from 'taro-ui';
import 'taro-ui/dist/style/index.scss';
import { useEffect, useState } from 'react';
import { View, Text, Button, Image, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { setTabBarIndex } from '../../store/tabbar';
import { request, saveTokens } from '../../utils/request';
import './index.scss';

const BASE_URL = 'https://www.hypercn.cn';

interface Note {
  id: string;
  title: string;
  content: string;
  media_data: Array<{
    url: string;
    thumbnail_url: string;
    width: number;
    height: number;
  }>;
  type: number;
  created_at: string;
}

interface UserStats {
  following: number;
  follower: number;
  likes: number;
  notes: number;
}

export default function UserPage() {
  // 用户状态
  const [isLogin, setIsLogin] = useState(false);
  const [userInfo, setUserInfo] = useState<any>({});
  const [userStats, setUserStats] = useState<UserStats>({
    following: 0,
    follower: 0,
    likes: 0,
    notes: 0
  });
  const [needPhoneAuth, setNeedPhoneAuth] = useState(false);

  // 弹窗状态
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tempAvatar, setTempAvatar] = useState('');
  const [tempNickname, setTempNickname] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // 布局适配状态
  const [statusBarHeight, setStatusBarHeight] = useState(20);
  const [navBarHeight, setNavBarHeight] = useState(44);

  // 笔记相关状态
  const [noteList, setNoteList] = useState<Note[]>([]);
  const [cursor, setCursor] = useState<string>('');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  // 生命周期
  useEffect(() => {
    setTabBarIndex(4);

    const sysInfo = Taro.getWindowInfo();
    const menuInfo = Taro.getMenuButtonBoundingClientRect();

    const sbHeight = sysInfo.statusBarHeight || 20;
    setStatusBarHeight(sbHeight);

    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height;
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44);

    const onUserUpdate = (u: any) => {
      setUserInfo(u);
      setIsLogin(true);
      setNeedPhoneAuth(!u.phone_number);
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

  // 登录后自动加载笔记
  useEffect(() => {
    if (isLogin) {
      loadMyNotes();
    }
  }, [isLogin]);

  // 初始化登录状态
  const initLoginState = () => {
    const accessToken = Taro.getStorageSync('access_token');
    const cachedUser = Taro.getStorageSync('userInfo');

    if (accessToken) {
      if (cachedUser) {
        setUserInfo(cachedUser);
        setIsLogin(true);
        setNeedPhoneAuth(!cachedUser.phone_number);
      }
      fetchLatestUserInfo();
    } else {
      handleLogin(true);
    }
  };

  // 获取最新用户信息
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

        setUserInfo(user);
        if (stats) {
          setUserStats(stats);
        }

        Taro.setStorageSync('userInfo', user);
        Taro.eventCenter.trigger('USER_INFO_UPDATED', user);

        setIsLogin(true);
        setNeedPhoneAuth(!user.phone_number);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 加载我的笔记
  const loadMyNotes = async (isLoadMore: boolean = false) => {
    // 如果正在加载，避免重复请求
    if (loading) return;

    // 如果是加载更多但没有更多数据，直接返回
    if (isLoadMore && !hasMore) return;

    setLoading(true);

    try {
      const params: any = {
        pageSize: 6
      };

      // 如果是加载更多，传入 cursor
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

  // 退出登录
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

  // 登录
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
      } else {
        if (!isSilent) {
          Taro.hideLoading();
          const errorMsg = resBody?.msg || '登录失败';
          Taro.showToast({ title: errorMsg, icon: 'none' });
        }
      }
    } catch (error) {
      if (!isSilent) {
        Taro.hideLoading();
        Taro.showToast({ title: '请求失败', icon: 'none' });
      }
      console.error('登录失败:', error);
    }
  };

  // 绑定手机号
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

  // 选择头像
  const onChooseAvatar = (e: any) => {
    setTempAvatar(e.detail.avatarUrl);
  };

  // 昵称输入
  const onNicknameBlur = (e: any) => {
    setTempNickname(e.detail.value);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowAuthModal(false);
  };

  // 打开编辑资料
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

  // 提交个人资料
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

  // 格式化数字
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

  // 点击统计数据
  const handleStatClick = (type: string | null) => {
    if (!isLogin || !hasData || !type) return;

    Taro.navigateTo({
      url: `/pages/user/follow-list/index?type=${type}&userId=${userInfo.user_id || ''}`
    });
  };

  // 点击笔记
  const handleNoteClick = (noteId: string) => {
    Taro.navigateTo({
      url: `/pages/square/post-detail/index?id=${noteId}`
    });
  };

  // 查看全部笔记
  const handleViewAll = () => {
    Taro.navigateTo({
      url: `/pages/user/profile/index?userId=${userInfo.user_id}`
    });
  };

  // 获取笔记封面图
  const getNoteCover = (note: Note): string => {
    if (note.media_data && note.media_data.length > 0) {
      return note.media_data[0].thumbnail_url || note.media_data[0].url;
    }
    return '';
  };

  // 点击导航项
  const handleItemClick = (item: any) => {
    if (!isLogin) {
      handleLogin(false);
      return;
    }

    if (item.route) {
      Taro.navigateTo({
        url: item.route
      });
    }
  };

  const hasData = isLogin || needPhoneAuth;

  const stats = [
    {
      label: '关注',
      value: hasData ? userStats?.following || 0 : '-',
      type: 'following'
    },
    {
      label: '粉丝',
      value: hasData ? userStats?.follower || 0 : '-',
      type: 'follower'
    },
    {
      label: '赞/收藏',
      value: hasData ? userStats?.likes || 0 : '-',
      type: null
    }
  ];

  const mainNavItems = [
    { icon: 'list', label: '订单', action: '全部订单', route: '/pages/order/index' },
    { icon: 'sketch', label: '钱包', action: '充值' },
    { icon: 'tag', label: '票务', action: '优惠券' },
    { icon: 'star', label: '积分', action: '积分' },
    { icon: 'home', label: '主办中心', action: '站点' }
  ];

  return (
    <ScrollView className="user-page-dark" scrollY>
      <View className="custom-nav-bar" style={{ height: `${statusBarHeight + navBarHeight}px` }}>
        <View style={{ height: `${statusBarHeight}px` }} />
        <View className="nav-bar-content" style={{ height: `${navBarHeight}px` }}>
          <Text className="page-title">我的</Text>
        </View>
      </View>

      <View className="header-section" style={{ marginTop: `${statusBarHeight + navBarHeight}px` }}>
        <View className="user-profile">
          <View className="avatar-container">
            {hasData && userInfo.avatar_url ? (
              <Image className="avatar-img" src={userInfo.avatar_url} mode="aspectFill" />
            ) : (
              <View className="avatar-placeholder">
                <AtIcon value="user" size="30" color="#999" />
              </View>
            )}
          </View>

          <View className="info-container">
            {isLogin ? (
              <>
                <View className="name-row">
                  <Text className="username">{userInfo.nickname || '微信用户'}</Text>
                  <View className="vip-tag">
                    <Text className="vip-text">VIP会员</Text>
                  </View>
                </View>
                <Text className="user-id">ID: {userInfo.user_id}</Text>
              </>
            ) : (
              <View className="login-actions">
                <Text className="welcome-text">
                  {needPhoneAuth ? `你好，${userInfo.nickname || '新用户'}` : '欢迎来到 HyperFun'}
                </Text>
                {needPhoneAuth ? (
                  <Button
                    className="login-btn phone-btn"
                    openType="getPhoneNumber"
                    onGetPhoneNumber={onGetPhoneNumber}
                  >
                    绑定手机号
                  </Button>
                ) : (
                  <Button className="login-btn" onClick={() => handleLogin(false)}>
                    立即登录 / 注册
                  </Button>
                )}
              </View>
            )}
          </View>

          <View className="edit-btn-wrap">
            <View className="edit-profile-btn" onClick={handleOpenEdit}>
              {isLogin ? '编辑资料' : '去登录'}
            </View>
          </View>
        </View>

        <View className="stats-row">
          {stats.map((stat, index) => (
            <View
              key={index}
              className={`stat-item ${stat.type ? 'clickable' : ''}`}
              onClick={() => handleStatClick(stat.type)}
            >
              <Text className="stat-val">{formatNumber(stat.value)}</Text>
              <Text className="stat-lbl">{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="main-nav-card">
        {mainNavItems.map((item, index) => (
          <View key={index} className="nav-item" onClick={() => handleItemClick(item)}>
            <View className="nav-icon-circle">
              <AtIcon value={item.icon} size="24" color="#fff" />
            </View>
            <Text className="nav-text">{item.label}</Text>
          </View>
        ))}
      </View>

      <View className="section-card">
        <View className="section-header">
          <View className="tab-active">
            <Text>我的订阅</Text>
          </View>
          <View className="tab-inactive">
            <Text>动态</Text>
          </View>
          <Text className="section-extra">3个活动</Text>
        </View>
        <View className="scroll-row">
          {[1, 2, 3].map(i => (
            <View key={i} className="activity-card">
              <View className="status-tag">
                <Text>进行中</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="section-card">
        <View className="section-header">
          <Text className="section-title">我参与的</Text>
          <Text className="section-more">查看全部</Text>
        </View>
        <View className="scroll-row">
          {[1, 2, 3].map(i => (
            <View key={i} className="poster-card" />
          ))}
        </View>
      </View>

      {/* 我的笔记区域 - 移到退出登录之前 */}
      {isLogin && (
        <View className="my-content-section">
          <View className="section-header">
            <Text className="section-title">
              我的动态 {userStats.notes > 0 && `(${userStats.notes})`}
            </Text>
            <Text className="section-more" onClick={handleViewAll}>
              查看全部
            </Text>
          </View>

          <View className="notes-container">
            {loading ? (
              <View className="loading-state">
                <Text className="loading-text">加载中...</Text>
              </View>
            ) : noteList.length > 0 ? (
              <View className="notes-grid">
                {noteList.slice(0, 6).map(note => (
                  <View key={String(note.id)} className="note-card" onClick={() => handleNoteClick(note.id)}>
                    <Image className="note-cover" src={getNoteCover(note)} mode="aspectFill" />
                    <Text className="note-title">{note.title}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="empty-state">
                <Text className="empty-icon">📝</Text>
                <Text className="empty-text">还没有发布笔记</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {isLogin && (
        <View className="logout-section">
          <View className="logout-btn" onClick={handleLogoutClick}>
            <Text>退出登录</Text>
          </View>
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
    </ScrollView>
  );
}
