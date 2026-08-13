import { AtIcon } from 'taro-ui';
import 'taro-ui/dist/style/index.scss';
import { useEffect, useRef, useState } from 'react';
import { View, Text, Button, Image, Input, ScrollView, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { cacheUserInfo, normalizeUserInfoPayload } from '@/utils/user-info';
import { requireLogin } from '@/utils/auth';
import { CHENGDU_CITY, CHENGDU_DISTRICTS, CHENGDU_PROVINCE, fetchChengduDistricts } from '@/utils/chengdu-region';
import { setTabBarIndex } from '../../store/tabbar';
import { request } from '../../utils/request';
import {
  PENDING_VERIFIER_SCAN_KEY,
  parseVerifierQrPayload
} from '../../utils/verifier-scan';
import {
  fetchOrganizerAuditStatus,
  getSettlementApplyInitialForm,
  submitSettlementApply as submitSettlementApplyRequest,
  uploadOrganizerAsset
} from '../user-sub/organizer/adapter';
import type { SettlementApplyForm } from '../user-sub/organizer/types';
import './index.scss';

const BASE_URL = 'https://www.hypercn.cn';

// 活动封面兜底图：订单关联活动被删除/下架时后端返回空 poster_list（约定不算接口失败），卡片用默认封面
const DEFAULT_ACTIVITY_POSTER = 'https://cdn.hypercn.cn/avatars/02/2/f3f49889.jpeg';

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

interface SubscribedActivityItem {
  id: number;
  name?: string;
  title: string;
  type: string;
  poster_list?: string;
  cover_image: string;
  location_name: string;
  lat: number;
  lng: number;
}

interface StackPosterItem {
  id: number;
  cover?: string;
  title?: string;
  is_hidden?: boolean;
}

type UserCenterRole = 'normal' | 'verifier' | 'organizer';

const getUserCenterRoleOverride = (): UserCenterRole | '' => {
  const params = Taro.getCurrentInstance().router?.params || {};
  const rawRole = params.mockUserRole || params.userRole || Taro.getStorageSync('__mock_user_center_role__');
  const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;
  return role === 'normal' || role === 'verifier' || role === 'organizer' ? role : '';
};

const isActiveVerifierUser = (user: any, roleOverride: UserCenterRole | '' = '') => {
  if (roleOverride === 'verifier') return true;
  if (roleOverride === 'normal' || roleOverride === 'organizer') return false;
  return Boolean(user?.verifier_status === 'active' || user?.is_verifier || user?.verifier_id);
};

const parseJSONWithBigInt = (jsonStr: string) => {
  if (typeof jsonStr !== 'string') return jsonStr;
  try {
    const fixedStr = jsonStr.replace(
      /"(id|user_id|note_id|root_id|parent_id|next_cursor|reply_to_user_id|peer_id)":\s*(\d{16,})/g,
      '"$1": "$2"'
    );
    return JSON.parse(fixedStr);
  } catch (error) {
    return {};
  }
};

export default function UserPage() {
  const initialSettlementModalOpenedRef = useRef(false);
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
  const [tempSignature, setTempSignature] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(20);
  const [navBarHeight, setNavBarHeight] = useState(44);
  const [noteList, setNoteList] = useState<Note[]>([]);
  const [cursor, setCursor] = useState<string>('');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'dynamic'>('activity');
  // 「我的动态」下的子 Tab：动态 / 赞过 / 收藏（赞过、收藏仅本人主页可见，本页即本人页）
  const [dynamicSubTab, setDynamicSubTab] = useState<'notes' | 'likes' | 'collects'>('notes');
  // 赞过/收藏两个 Tab 的列表数据（仅本人主页展示）
  const [likedNotes, setLikedNotes] = useState<Note[]>([]);
  const [collectedNotes, setCollectedNotes] = useState<Note[]>([]);
  const [likedTotal, setLikedTotal] = useState(0);
  const [collectedTotal, setCollectedTotal] = useState(0);
  const [likeTabLoading, setLikeTabLoading] = useState(false);
  const likeTabFetchedRef = useRef<Record<'likes' | 'collects', boolean>>({ likes: false, collects: false });
  const [activitySubTab, setActivitySubTab] = useState<'joined' | 'subscribed'>('joined');
  const [joinedActivityList, setJoinedActivityList] = useState<StackPosterItem[]>([]);
  const [joinedActivityLoading, setJoinedActivityLoading] = useState(false);
  const [joinedActivityError, setJoinedActivityError] = useState('');
  const [subscribedActivityList, setSubscribedActivityList] = useState<StackPosterItem[]>([]);
  const [subscribedActivityLoading, setSubscribedActivityLoading] = useState(false);
  const [subscribedActivityError, setSubscribedActivityError] = useState('');
  // 标记订阅活动是否已拉取过（无论结果是否为空），防止空结果时被 effect 循环拉取
  const subscribedFetchedRef = useRef(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementForm, setSettlementForm] = useState<SettlementApplyForm>(getSettlementApplyInitialForm());
  const [settlementDistricts, setSettlementDistricts] = useState<string[]>(CHENGDU_DISTRICTS);
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementLogoUploading, setSettlementLogoUploading] = useState(false);
  const [, setOrganizerAuditStatus] = useState<number | null>(null);
  const [mainNavScrolling, setMainNavScrolling] = useState(false);
  const mainNavScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideNativeTabBar = () => {
    try {
      const hideResult = Taro.hideTabBar({ animation: false }) as any;
      hideResult?.catch?.(() => undefined);
    } catch (_) {
      // custom tabbar fallback: unsupported runtimes can ignore this.
    }
  };

  useEffect(() => {
    setTabBarIndex(4);

    const sysInfo = Taro.getWindowInfo();
    const menuInfo = Taro.getMenuButtonBoundingClientRect();
    const sbHeight = sysInfo.statusBarHeight || 20;
    setStatusBarHeight(sbHeight);

    const nbHeight = (menuInfo.top - sbHeight) * 2 + menuInfo.height;
    setNavBarHeight(nbHeight > 0 ? nbHeight : 44);

    const onUserUpdate = (u: any) => {
      const normalized = normalizeUserInfoPayload(u);
      setUserInfo(normalized);
      setIsLogin(true);
      setNeedPhoneAuth(!normalized.phone_number);
    };
    Taro.eventCenter.on('USER_INFO_UPDATED', onUserUpdate);

    initLoginState();

    return () => {
      Taro.eventCenter.off('USER_INFO_UPDATED', onUserUpdate);
      if (mainNavScrollTimer.current) clearTimeout(mainNavScrollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (initialSettlementModalOpenedRef.current) return;
    const params = Taro.getCurrentInstance().router?.params || {};
    const shouldOpenSettlementModal = params.settlementModal === '1' || params.openSettlementModal === '1';
    if (!shouldOpenSettlementModal) return;
    initialSettlementModalOpenedRef.current = true;
    setSettlementForm(getSettlementApplyInitialForm());
    setShowSettlementModal(true);
  }, []);

  useEffect(() => {
    if (!showSettlementModal) return;
    hideNativeTabBar();
    // 运营城市固定为成都：省份/城市锁定，仅开放成都区县选择
    setSettlementForm(prev => ({ ...prev, province: CHENGDU_PROVINCE, city: CHENGDU_CITY }));
    fetchChengduDistricts().then(setSettlementDistricts);
  }, [showSettlementModal]);

  Taro.useDidShow(() => {
    setTabBarIndex(4);
    hideNativeTabBar();
    const accessToken = Taro.getStorageSync('access_token');
    if (accessToken) {
      fetchLatestUserInfo();
      fetchJoinedActivities();
      fetchSubscribedActivities();
      refreshOrganizerAuditStatus();
    }
  });

  // 个人主页下拉刷新：全量重拉用户资料、活动与动态
  Taro.usePullDownRefresh(async () => {
    const accessToken = Taro.getStorageSync('access_token');
    if (!accessToken) {
      Taro.stopPullDownRefresh();
      return;
    }
    let success = true;
    try {
      await Promise.all([
        fetchLatestUserInfo(),
        fetchJoinedActivities(),
        fetchSubscribedActivities(),
        refreshOrganizerAuditStatus(),
        loadMyNotes(),
        ...(likeTabFetchedRef.current.likes ? [fetchLikeCollectNotes('likes')] : []),
        ...(likeTabFetchedRef.current.collects ? [fetchLikeCollectNotes('collects')] : [])
      ]);
    } catch {
      success = false;
    } finally {
      Taro.stopPullDownRefresh();
      // 与消息页一致：刷新结束给出明确结果提示
      Taro.showToast({
        title: success ? '刷新成功' : '刷新失败，请重试',
        icon: success ? 'success' : 'none'
      });
    }
  });

  useEffect(() => {
    if (isLogin) {
      loadMyNotes();
    }
  }, [isLogin]);

  useEffect(() => {
    if (!isLogin) return;
    if (activitySubTab !== 'subscribed') return;
    if (subscribedFetchedRef.current) return;
    if (subscribedActivityList.length > 0) return;
    if (subscribedActivityLoading) return;
    if (subscribedActivityError) return;
    fetchSubscribedActivities();
  }, [isLogin, activitySubTab, subscribedActivityList.length, subscribedActivityLoading, subscribedActivityError]);

  const initLoginState = () => {
    const accessToken = Taro.getStorageSync('access_token');
    const cachedUser = Taro.getStorageSync('userInfo');

    if (accessToken) {
      if (cachedUser) {
        const normalizedCachedUser = normalizeUserInfoPayload(cachedUser);
        setUserInfo(normalizedCachedUser);
        setIsLogin(true);
        setNeedPhoneAuth(!normalizedCachedUser.phone_number);
        Taro.setStorageSync('userInfo', normalizedCachedUser);
      }
      fetchLatestUserInfo();
      refreshOrganizerAuditStatus();
    } else {
      setIsLogin(false);
      setOrganizerAuditStatus(null);
      setNeedPhoneAuth(false);
      setSubscribedActivityList([]);
      setSubscribedActivityError('');
      setSubscribedActivityLoading(false);
      setJoinedActivityList([]);
      setJoinedActivityError('');
      setJoinedActivityLoading(false);
    }
  };

  const refreshOrganizerAuditStatus = async () => {
    try {
      const audit = await fetchOrganizerAuditStatus();
      setOrganizerAuditStatus(audit.status);
    } catch (error) {
      setOrganizerAuditStatus(null);
    }
  };

  const fetchLatestUserInfo = async () => {
    try {
      const res = await request({
        url: '/api/v1/user/info',
        method: 'GET'
      });
      const resBody: any = parseJSONWithBigInt(res.data as string);

      if (resBody && resBody.code === 200 && resBody.data) {
        const { stats } = resBody.data;
        const normalizedUser = cacheUserInfo(resBody.data);
        setUserInfo(normalizedUser);
        if (stats) {
          setUserStats(stats);
        }
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

      const accessToken = Taro.getStorageSync('access_token');
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/user/my-notes`,
        method: 'GET',
        data: params,
        header: { Authorization: accessToken ? `Bearer ${accessToken}` : '' },
        dataType: 'string',
        responseType: 'text'
      });
      const resBody: any = parseJSONWithBigInt(res.data as string);

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

  // 赞过/收藏列表：/api/v1/note/my/likes、/api/v1/note/my/collects（page + pageSize 分页）
  const fetchLikeCollectNotes = async (kind: 'likes' | 'collects', page: number = 1) => {
    if (likeTabLoading) return;
    setLikeTabLoading(true);
    try {
      const accessToken = Taro.getStorageSync('access_token');
      const res = await Taro.request({
        url: `${BASE_URL}/api/v1/note/my/${kind}`,
        method: 'GET',
        data: { page, pageSize: 20 },
        header: { Authorization: accessToken ? `Bearer ${accessToken}` : '' },
        dataType: 'string',
        responseType: 'text'
      });
      const resBody: any = parseJSONWithBigInt(res.data as string);
      if (resBody && resBody.code === 200 && resBody.data) {
        const notes: Note[] = Array.isArray(resBody.data.notes) ? resBody.data.notes : [];
        const total = Number(resBody.data.total || 0);
        if (kind === 'likes') {
          setLikedNotes(prev => (page === 1 ? notes : [...prev, ...notes]));
          setLikedTotal(Number.isFinite(total) ? total : notes.length);
        } else {
          setCollectedNotes(prev => (page === 1 ? notes : [...prev, ...notes]));
          setCollectedTotal(Number.isFinite(total) ? total : notes.length);
        }
        likeTabFetchedRef.current[kind] = true;
      } else {
        Taro.showToast({ title: resBody?.msg || '加载失败', icon: 'none' });
      }
    } catch (error) {
      console.error('加载赞过/收藏失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLikeTabLoading(false);
    }
  };

  const handleDynamicSubTabSwitch = (tab: 'notes' | 'likes' | 'collects') => {
    setDynamicSubTab(tab);
    if ((tab === 'likes' || tab === 'collects') && isLogin && !likeTabFetchedRef.current[tab]) {
      void fetchLikeCollectNotes(tab);
    }
  };

  const fetchSubscribedActivities = async () => {
    // 标记已拉取过，空结果时不再被 effect 反复触发（修复"加载中/无结果"闪烁）
    subscribedFetchedRef.current = true;
    setSubscribedActivityLoading(true);
    setSubscribedActivityError('');
    try {
      const res = await request({
        url: '/api/v1/activity/subscriptions?page=1&pageSize=20',
        method: 'GET'
      });
      const body: any = res?.data;
      if (body?.code !== 200 || !Array.isArray(body?.data?.list)) {
        setSubscribedActivityList([]);
        setSubscribedActivityError('加载失败，点击重试');
        return;
      }
      const source = Array.isArray(body?.data?.list) ? body.data.list : [];
      const mapped: StackPosterItem[] = source
        .map((item: SubscribedActivityItem) => ({
          id: Number(item?.id) || 0,
          cover: item?.poster_list || item?.cover_image || '',
          title: String(item?.name || item?.title || '活动')
        }))
        .filter((item: StackPosterItem) => item.id > 0);
      setSubscribedActivityList(mapped);
    } catch (error) {
      setSubscribedActivityList([]);
      setSubscribedActivityError('加载失败，点击重试');
    } finally {
      setSubscribedActivityLoading(false);
    }
  };

  const fetchJoinedActivities = async () => {
    setJoinedActivityLoading(true);
    setJoinedActivityError('');
    try {
      const res = await request({
        url: '/api/v1/order/list',
        method: 'GET',
        data: {
          page: 1,
          size: 50
        }
      });
      const body: any = res?.data;
      const list = Array.isArray(body?.data?.list) ? body.data.list : [];
      const unique = new Map<number, StackPosterItem>();
      list
        .filter((item: any) => Number(item?.status) === 1 || Number(item?.status) === 2)
        .forEach((item: any) => {
          const activity = item?.activity || {};
          const id = Number(activity?.id || item?.activity_id || 0);
          if (!id || unique.has(id)) return;
          // 订单的 activity 稳定返回 poster_list / is_hidden；已删除活动由后端兜底为 is_hidden=true + 空海报
          const poster = activity?.poster_list || activity?.cover_image || activity?.cover || '';
          const rawCover = Array.isArray(poster) ? String(poster[0] || '') : String(poster || '');
          unique.set(id, {
            id,
            cover: rawCover || DEFAULT_ACTIVITY_POSTER,
            title: String(activity?.name || activity?.title || '活动'),
            // is_hidden=true 是唯一的下架判断字段
            is_hidden: activity?.is_hidden === true || Number(activity?.is_hidden) === 1
          });
        });
      setJoinedActivityList(Array.from(unique.values()));
    } catch (error) {
      setJoinedActivityList([]);
      setJoinedActivityError('加载失败，点击重试');
    } finally {
      setJoinedActivityLoading(false);
    }
  };

  const handleLogout = () => {
    // 退出登录后降级为游客态留在当前页，不再强制跳登录页
    Taro.removeStorageSync('access_token');
    Taro.removeStorageSync('refresh_token');
    Taro.removeStorageSync('access_expire');
    Taro.removeStorageSync('userInfo');
    Taro.eventCenter.trigger('FORCE_LOGOUT');
    setIsLogin(false);
    setOrganizerAuditStatus(null);
    setUserInfo({});
    setUserStats({ following: 0, follower: 0, likes: 0, notes: 0 });
    setNoteList([]);
    setCursor('');
    setHasMore(false);
    setSubscribedActivityList([]);
    setSubscribedActivityError('');
    setSubscribedActivityLoading(false);
    setJoinedActivityList([]);
    setJoinedActivityError('');
    setJoinedActivityLoading(false);
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
    if (!requireLogin()) return;
    setTempAvatar(userInfo.avatar_url || '');
    setTempNickname(userInfo.nickname || '');
    setTempSignature(userInfo.signature || '');
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
        tempAvatar.startsWith('wxfile://') ||
        tempAvatar.startsWith('http://tmp/') ||
        tempAvatar.startsWith('https://tmp/');

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
        data: { nickname: tempNickname, avatar: finalAvatarUrl, signature: tempSignature }
      });

      Taro.hideLoading();

      const resBody: any = updateRes.data;
      if (resBody && resBody.code === 200) {
        const nextUserInfo = {
          ...userInfo,
          nickname: tempNickname,
          avatar_url: finalAvatarUrl,
          avatar: finalAvatarUrl,
          signature: tempSignature
        };
        setUserInfo(nextUserInfo);
        Taro.setStorageSync('userInfo', nextUserInfo);
        Taro.eventCenter.trigger('USER_INFO_UPDATED', nextUserInfo);
        setShowAuthModal(false);
        Taro.showToast({ title: '保存成功', icon: 'success' });
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

  const handleActivityCardClick = (item: StackPosterItem) => {
    if (!item?.id) return;
    Taro.navigateTo({
      url: `/pages/activity/index?id=${item.id}`
    });
  };

  const deleteMyNote = async (noteId: string, event?: any) => {
    event?.stopPropagation?.();
    if (!noteId) return;
    Taro.showModal({
      title: '删除动态',
      content: '确认删除这条动态吗？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#FF2E4D',
      success: async (modalRes) => {
        if (!modalRes.confirm) return;
        try {
          const res = await request({
            url: `/api/v1/note/${noteId}`,
            method: 'DELETE'
          });
          const body: any = res?.data;
          if (body && body.code !== 200) {
            throw new Error(body.msg || '删除失败');
          }
          setNoteList(prev => prev.filter(note => String(note.id) !== String(noteId)));
          setUserStats(prev => ({ ...prev, notes: Math.max(Number(prev.notes || 0) - 1, 0) }));
          Taro.showToast({ title: '已删除', icon: 'success' });
        } catch (error: any) {
          Taro.showToast({ title: error?.message || '删除失败，后端接口未开放', icon: 'none' });
        }
      }
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

  // 动态/赞过/收藏共用的双列瀑布流；deletable 仅“我的动态”为 true（长按删除自己帖子）
  const renderNoteWaterfall = (notes: Note[], deletable: boolean) => (
    <View className="waterfall">
      {[0, 1].map(col => (
        <View key={col} className="waterfall-column">
          {notes.filter((_, i) => i % 2 === col).map(note => {
            const media = note.media_data?.[0];
            const imageHeight = calculateImageHeight(media);
            return (
              <View
                key={String(note.id)}
                className="note-card"
                onClick={() => handleNoteClick(note.id)}
                onLongPress={deletable ? (event) => deleteMyNote(note.id, event) : undefined}
              >
                <Image
                  className="note-cover"
                  src={getNoteCover(note)}
                  mode="aspectFill"
                  style={{ height: `${imageHeight}px` }}
                />
                <Text className="note-title">{note.title}</Text>
                {deletable && (
                  <View className="note-delete-action" onClick={(event) => deleteMyNote(note.id, event)}>
                    删除
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const showOrganizerPendingModal = (content = '入驻申请正在审核，请等待审核结果后再进入管理后台。') => {
    Taro.showModal({
      title: '审核中',
      content,
      showCancel: false,
      confirmText: '我知道了'
    });
  };

  const showOrganizerApprovedModal = () => {
    Taro.showModal({
      title: '已通过',
      content: '入驻申请已通过，请从管理后台进入主办中心。',
      showCancel: false,
      confirmText: '我知道了'
    });
  };

  const openSettlementApply = async () => {
    Taro.showLoading({ title: '检查状态...', mask: true });
    try {
      const audit = await fetchOrganizerAuditStatus();
      setOrganizerAuditStatus(audit.status);
      if (audit.status === 1) {
        showOrganizerPendingModal();
        return;
      }
      if (audit.status === 2) {
        showOrganizerApprovedModal();
        return;
      }
      if (audit.status === 3) {
        const modalResult = await Taro.showModal({
          title: '审核未通过',
          content: audit.rejectReason || '入驻申请未通过审核，请修改资料后重新提交。',
          confirmText: '重新提交',
          cancelText: '稍后处理'
        });
        if (!modalResult.confirm) return;
      }
      if (audit.status !== 0 && audit.status !== 3) {
        Taro.showToast({ title: '审核状态异常，请稍后重试', icon: 'none' });
        return;
      }
      setSettlementForm(getSettlementApplyInitialForm());
      setShowSettlementModal(true);
    } catch {
      setOrganizerAuditStatus(null);
      Taro.showToast({ title: '审核状态获取失败，请稍后重试', icon: 'none' });
    } finally {
      Taro.hideLoading();
    }
  };

  const handleItemClick = (item: any) => {
    if (!requireLogin()) return;

    if (item.action === 'settlementApply') {
      void openSettlementApply();
      return;
    }

    if (item.action === 'organizerPending') {
      showOrganizerPendingModal();
      return;
    }

    if (item.route) {
      Taro.navigateTo({ url: item.route });
    }
  };


  const navScrollData = useRef({ scrollLeft: 0, scrollWidth: 1 })
  const [navBarWidthPx, setNavBarWidthPx] = useState(0)

  useEffect(() => {
    setTimeout(() => {
      const query = Taro.createSelectorQuery()
      query.select('.main-nav-card').boundingClientRect((rect: any) => {
        if (rect?.width) setNavBarWidthPx(rect.width)
      }).exec()
    }, 300)
  }, [])

  const handleMainNavScroll = (e: any) => {
    setMainNavScrolling(true)
    if (mainNavScrollTimer.current) clearTimeout(mainNavScrollTimer.current)
    mainNavScrollTimer.current = setTimeout(() => {
      setMainNavScrolling(false)
    }, 700)

    const detail = e?.detail || {}
    navScrollData.current = {
      scrollLeft: detail.scrollLeft || 0,
      scrollWidth: detail.scrollWidth || 1,
    }
  }

  // 用 CSS 变量驱动滚动条位置，避免百分比精度问题
  const navScrollBarStyle = (() => {
    const { scrollLeft, scrollWidth } = navScrollData.current
    const cardW = navBarWidthPx || (Taro.getWindowInfo().windowWidth - 60)
    if (!scrollWidth || scrollWidth <= cardW) return { left: '0%', width: '100%', opacity: 0 }

    const maxScroll = scrollWidth - cardW
    const percent = Math.min(scrollLeft / Math.max(maxScroll, 1), 1)
    const barW = (cardW / scrollWidth) * 100
    const barLeft = percent * (100 - barW)
    console.log('[NavScroll]', { scrollLeft, scrollWidth, cardW, maxScroll, percent: percent.toFixed(3), barW: barW.toFixed(1), barLeft: barLeft.toFixed(1) })
    return { left: `${barLeft}%`, width: `${barW}%` }
  })()

  const updateSettlementForm = <K extends keyof SettlementApplyForm>(key: K, value: SettlementApplyForm[K]) => {
    setSettlementForm(prev => ({ ...prev, [key]: value }));
  };

  const handleChooseSettlementDistrict = (event: any) => {
    const index = Number(event?.detail?.value);
    setTimeout(hideNativeTabBar, 0);
    if (!Number.isInteger(index) || index < 0 || index >= settlementDistricts.length) return;
    setSettlementForm(prev => ({
      ...prev,
      province: CHENGDU_PROVINCE,
      city: CHENGDU_CITY,
      district: settlementDistricts[index]
    }));
  };

  const handleCancelSettlementRegion = () => {
    setTimeout(hideNativeTabBar, 0);
  };

  const handleUploadSettlementLogo = async () => {
    if (settlementLogoUploading) return;
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      const filePath = res.tempFilePaths[0];
      if (!filePath) return;

      setSettlementLogoUploading(true);
      Taro.showLoading({ title: '上传中...', mask: true });
      const url = await uploadOrganizerAsset(filePath, 'organizer_logo');
      updateSettlementForm('logo', url);
      Taro.showToast({ title: '上传成功', icon: 'success' });
    } catch (error: any) {
      const message = String(error?.errMsg || '');
      if (!message.includes('cancel')) {
        Taro.showToast({ title: error?.message || '上传失败，请重试', icon: 'none' });
      }
    } finally {
      setSettlementLogoUploading(false);
      Taro.hideLoading();
    }
  };

  const submitSettlementApply = async () => {
    if (!settlementForm.name.trim()) {
      Taro.showToast({ title: '请输入主办方名称', icon: 'none' });
      return;
    }
    if (!settlementForm.province || !settlementForm.city || !settlementForm.district) {
      Taro.showToast({ title: '请选择区县', icon: 'none' });
      return;
    }

    setSettlementSubmitting(true);
    try {
      const latestAudit = await fetchOrganizerAuditStatus();
      setOrganizerAuditStatus(latestAudit.status);
      if (latestAudit.status === 1) {
        setShowSettlementModal(false);
        showOrganizerPendingModal();
        return;
      }
      if (latestAudit.status === 2) {
        setShowSettlementModal(false);
        showOrganizerApprovedModal();
        return;
      }
      if (latestAudit.status !== 0 && latestAudit.status !== 3) {
        Taro.showToast({ title: '审核状态异常，请稍后重试', icon: 'none' });
        return;
      }
      const applyResult = await submitSettlementApplyRequest(settlementForm);
      setOrganizerAuditStatus(applyResult.status);
      setShowSettlementModal(false);
      void refreshOrganizerAuditStatus();
      showOrganizerPendingModal('入驻申请已提交，预计 1-3 个工作日完成审核。');
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('审核中') || message.includes('重复提交')) {
        setOrganizerAuditStatus(1);
        setShowSettlementModal(false);
        void refreshOrganizerAuditStatus();
        showOrganizerPendingModal(message || '入驻申请正在审核，请勿重复提交。');
        return;
      }
      Taro.showToast({ title: message || '审核状态获取失败，请稍后重试', icon: 'none' });
    } finally {
      setSettlementSubmitting(false);
    }
  };

  const handleScanFromUserCenter = async () => {
    try {
      const scanResult = await Taro.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode', 'barCode']
      });
      const payload = parseVerifierQrPayload(scanResult.result);
      if (!payload) {
        Taro.showModal({
          title: '二维码无法核销',
          content: '未识别到有效的 HYPER 入场二维码，请重新扫描订单详情页中的入场码。',
          showCancel: false,
          confirmText: '我知道了'
        });
        return;
      }
      Taro.setStorageSync(PENDING_VERIFIER_SCAN_KEY, payload);
      Taro.navigateTo({
        url: '/pages/user-sub/organizer/index?view=verify&source=userScan'
      });
    } catch (error: any) {
      const message = String(error?.errMsg || '');
      if (!message.includes('cancel')) {
        Taro.showToast({ title: '扫码失败，请重试', icon: 'none' });
      }
    }
  };

  // 顶部客服入口：改走站内 IM（平台客服账号），不再用微信原生客服（无人值守，消息收不到）
  const handleOpenCustomerService = async () => {
    if (!isLogin) {
      requireLogin();
      return;
    }
    try {
      const res = await request({ url: '/api/v1/user/customer-service', method: 'GET' });
      const body: any = res?.data;
      const serviceUserId = Number(body?.data?.user_id || 0);
      if (body?.code === 200 && serviceUserId > 0) {
        const name = String(body.data.nickname || 'Hyper 客服');
        Taro.navigateTo({
          url: `/pages/chat/index?peer_id=${serviceUserId}&title=${encodeURIComponent(name)}&type=1`
        });
        return;
      }
      Taro.showToast({ title: body?.code === 404 ? '客服暂不可用' : body?.msg || '客服暂不可用', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: '客服暂不可用', icon: 'none' });
    }
  };

  const hasData = isLogin || needPhoneAuth;
  const roleOverride = getUserCenterRoleOverride();
  const isActiveVerifier = isActiveVerifierUser(userInfo, roleOverride);
  const joinDate = userInfo?.created_at ? String(userInfo.created_at).split('T')[0] : '';
  const currentActivityList = activitySubTab === 'joined' ? joinedActivityList : subscribedActivityList;
  const subscribedStackCovers = subscribedActivityList.slice(0, 5);
  const subscribedRemainCount = Math.max(subscribedActivityList.length - 5, 0);
  const subscribedRemainLabel = subscribedRemainCount > 99 ? '99+' : `${subscribedRemainCount}+`;

  const stats = [
    { label: '获赞/收藏', value: hasData ? userStats?.likes || 0 : '-', type: null },
    { label: '关注', value: hasData ? userStats?.following || 0 : '-', type: 'following' },
    { label: '粉丝', value: hasData ? userStats?.follower || 0 : '-', type: 'follower' }
  ];

  const settlementEntry = {
    icon: require('../../assets/images/Settlement.png'),
    iconClass: 'settlement',
    label: '我要入驻',
    action: 'settlementApply'
  };

  const organizerEntry = {
    icon: require('../../assets/images/Event_Organizing_Center.png'),
    iconClass: '',
    label: '管理后台',
    route: '/pages/user-sub/organizer/index'
  };

  const verifierEntry = isActiveVerifier
    ? {
        iconClass: 'verify-records',
        label: '核销记录',
        route: '/pages/user-sub/organizer/index?view=verifyRecords&source=userNav'
      }
    : null;

  const mainNavItems = [
    {
      icon: require('../../assets/images/Order.png'),
      iconClass: 'order',
      label: '订单',
      route: '/pages/order/index'
    },
    {
      icon: require('../../assets/images/Points.png'),
      iconClass: 'points',
      label: '积分',
      route: '/pages/user-sub/points/index'
    },
    settlementEntry,
    organizerEntry,
    verifierEntry
  ].filter(Boolean) as Array<{
    icon?: string;
    iconClass?: string;
    label: string;
    route?: string;
    action?: string;
  }>;

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
          <View className="nav-side nav-tools-left">
            {isActiveVerifier && (
              <View className="nav-tool-btn scan" onClick={handleScanFromUserCenter}>
                <View className="scan-line-icon">
                  <View className="scan-corner tl" />
                  <View className="scan-corner tr" />
                  <View className="scan-corner bl" />
                  <View className="scan-corner br" />
                  <View className="scan-midline" />
                </View>
              </View>
            )}
            <View className="nav-tool-btn contact" onClick={handleOpenCustomerService}>
              <View className="contact-line-icon">
                <View className="contact-arc" />
                <View className="contact-dot left" />
                <View className="contact-dot right" />
              </View>
            </View>
          </View>
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
        <ScrollView
          className="main-nav-scroll"
          scrollX
          enhanced
          showScrollbar={false}
          onScroll={handleMainNavScroll}
        >
          <View className="main-nav-track">
            {mainNavItems.map((item, index) => (
              <View key={index} className="nav-item" onClick={() => handleItemClick(item)}>
                {item.icon ? (
                  <View className="nav-icon">
                    <Image className={`nav-icon-img ${item.iconClass || ''}`} src={item.icon} mode="aspectFit" />
                  </View>
                ) : (
                  <View className={`nav-icon nav-css-icon ${item.iconClass || ''}`} />
                )}
                <Text className="nav-text">{item.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View
          className={`main-nav-scrollbar ${mainNavScrolling ? 'active' : ''}`}
          style={{ ...navScrollBarStyle, right: 'auto' }}
        />
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
            <Text
              className={`activity-title ${activitySubTab === 'joined' ? 'active' : ''}`}
              onClick={() => setActivitySubTab('joined')}
            >
              {'\u6211\u53c2\u52a0\u8fc7\u7684\u6d3b\u52a8'}
            </Text>
            <View className="activity-divider" />
            <Text
              className={`activity-title ${activitySubTab === 'subscribed' ? 'active' : ''}`}
              onClick={() => setActivitySubTab('subscribed')}
            >
              {`\u6211\u8ba2\u9605\u7684\u6d3b\u52a8\uff08${subscribedActivityList.length}\uff09`}
            </Text>
          </View>
          {activitySubTab === 'subscribed' ? (
            subscribedActivityLoading ? (
              <View className="activity-stack-state">加载中...</View>
            ) : subscribedActivityError ? (
              <View className="activity-stack-state error" onClick={() => { void fetchSubscribedActivities(); }}>
                {subscribedActivityError}
              </View>
            ) : subscribedActivityList.length > 0 ? (
              <View className="activity-stack">
                {subscribedStackCovers.map((item, index) => (
                  <View key={item.id} className="activity-stack-item" style={{ zIndex: 100 - index }} onClick={() => handleActivityCardClick(item)}>
                    {!!item.cover && <Image className="activity-stack-img" src={item.cover} mode="aspectFill" />}
                  </View>
                ))}
                {subscribedRemainCount > 0 && (
                  <View className="activity-stack-item activity-stack-more" style={{ zIndex: 90 - subscribedStackCovers.length }}>
                    <Text className="activity-stack-more-text">{subscribedRemainLabel}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="activity-empty">
                <View className="activity-empty-icon">
                  <AtIcon value="calendar" size="20" color="rgba(255,255,255,0.45)" />
                </View>
                <Text className="activity-empty-title">{'\u6682\u65e0\u8ba2\u9605\u7684\u6d3b\u52a8'}</Text>
                <Text className="activity-empty-tip">{'\u53bb\u9996\u9875\u6216\u6d3b\u52a8\u5217\u8868\u770b\u770b\u5427'}</Text>
              </View>
            )
          ) : joinedActivityLoading ? (
            <View className="activity-stack-state">加载中...</View>
          ) : joinedActivityError ? (
            <View className="activity-stack-state error" onClick={() => { void fetchJoinedActivities(); }}>
              {joinedActivityError}
            </View>
          ) : currentActivityList.length > 0 ? (
            <ScrollView className="activity-scroll" scrollX enableFlex>
              {currentActivityList.map((item) => (
                <View key={item.id} className="activity-poster" onClick={() => handleActivityCardClick(item)}>
                  {!!item.cover && <Image className="activity-poster-img" src={item.cover} mode="aspectFill" />}
                  {item.is_hidden && (
                    <View className="activity-poster-mask">
                      <Text className="activity-poster-mask-text">已下架</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View className="activity-empty">
              <View className="activity-empty-icon">
                <AtIcon value="calendar" size="20" color="rgba(255,255,255,0.45)" />
              </View>
              <Text className="activity-empty-title">{'\u6682\u65e0\u53c2\u52a0\u8fc7\u7684\u6d3b\u52a8'}</Text>
              <Text className="activity-empty-tip">{'\u53bb\u9996\u9875\u6216\u6d3b\u52a8\u5217\u8868\u770b\u770b\u5427'}</Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'dynamic' && (
        <View className="notes-section">
          <View className="activity-header">
            <Text
              className={`activity-title ${dynamicSubTab === 'notes' ? 'active' : ''}`}
              onClick={() => handleDynamicSubTabSwitch('notes')}
            >
              动态
            </Text>
            <View className="activity-divider" />
            <Text
              className={`activity-title ${dynamicSubTab === 'likes' ? 'active' : ''}`}
              onClick={() => handleDynamicSubTabSwitch('likes')}
            >
              赞过
            </Text>
            <View className="activity-divider" />
            <Text
              className={`activity-title ${dynamicSubTab === 'collects' ? 'active' : ''}`}
              onClick={() => handleDynamicSubTabSwitch('collects')}
            >
              收藏
            </Text>
          </View>

          {dynamicSubTab === 'notes' ? (
            <>
              {noteList.length > 0 ? (
                renderNoteWaterfall(noteList, true)
              ) : (
                <View className="empty-state">
                  <Text className="empty-icon">暂无</Text>
                  <Text className="empty-text">还没有发布动态</Text>
                </View>
              )}

              {loading && (
                <View className="loading-state">
                  <Text className="loading-text">加载中...</Text>
                </View>
              )}
            </>
          ) : (
            (() => {
              const isLikes = dynamicSubTab === 'likes';
              const notes = isLikes ? likedNotes : collectedNotes;
              const total = isLikes ? likedTotal : collectedTotal;
              return (
                <>
                  {notes.length > 0 ? (
                    renderNoteWaterfall(notes, false)
                  ) : likeTabLoading ? (
                    <View className="loading-state">
                      <Text className="loading-text">加载中...</Text>
                    </View>
                  ) : (
                    <View className="empty-state">
                      <Text className="empty-icon">暂无</Text>
                      <Text className="empty-text">{isLikes ? '还没有赞过的内容' : '还没有收藏的内容'}</Text>
                    </View>
                  )}

                  {notes.length > 0 && notes.length < total && (
                    <View
                      className="loading-state"
                      onClick={() => void fetchLikeCollectNotes(dynamicSubTab, Math.floor(notes.length / 20) + 1)}
                    >
                      <Text className="loading-text">{likeTabLoading ? '加载中...' : '加载更多'}</Text>
                    </View>
                  )}
                </>
              );
            })()
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

            <View className="profile-edit-field">
              <Text className="label">昵称</Text>
              <Input
                type="nickname"
                className="nickname-input"
                placeholder="请输入昵称"
                value={tempNickname}
                onBlur={onNicknameBlur}
                onInput={e => setTempNickname(e.detail.value)}
              />
              <View className="profile-edit-icon" />
            </View>

            <View className="profile-edit-field">
              <Text className="label">个性签名</Text>
              <Input
                className="nickname-input"
                placeholder="请输入个性签名"
                placeholderClass="profile-edit-placeholder"
                value={tempSignature}
                onInput={e => setTempSignature(e.detail.value)}
              />
              <View className="profile-edit-icon" />
            </View>

            <Button className="save-btn" onClick={handleSubmitProfile}>
              保存
            </Button>
          </View>
        </View>
      )}

      {showSettlementModal && (
        <View className="settlement-modal-overlay" onClick={() => setShowSettlementModal(false)}>
          <View className="settlement-modal-card" onClick={(event) => event.stopPropagation()}>
            <View className="settlement-modal-header">
              <View>
                <Text className="settlement-modal-title">主办方入驻申请</Text>
                <Text className="settlement-modal-desc">提交后将进入审核，审核中不可重复提交。</Text>
              </View>
              <Text className="settlement-modal-close" onClick={() => setShowSettlementModal(false)}>关闭</Text>
            </View>

            <ScrollView className="settlement-modal-scroll" scrollY>
              <Text className="settlement-field-label">*名称</Text>
              <View className="settlement-input-shell">
                <Input
                  className="settlement-input"
                  placeholder="请输入入驻名称"
                  placeholderClass="settlement-placeholder"
                  value={settlementForm.name}
                  onInput={(event) => updateSettlementForm('name', event.detail.value)}
                />
              </View>

              <Text className="settlement-field-label">*入驻类型</Text>
              <View className="settlement-type-row">
                <View
                  className={`settlement-type-option ${settlementForm.type === 'party' ? 'active' : ''}`}
                  onClick={() => updateSettlementForm('type', 'party')}
                >
                  <Text className={`settlement-type-text ${settlementForm.type === 'party' ? 'active' : ''}`}>派对</Text>
                </View>
                <View
                  className={`settlement-type-option ${settlementForm.type === 'venue' ? 'active' : ''}`}
                  onClick={() => updateSettlementForm('type', 'venue')}
                >
                  <Text className={`settlement-type-text ${settlementForm.type === 'venue' ? 'active' : ''}`}>场地</Text>
                </View>
              </View>

              <Text className="settlement-field-label">Logo 图片</Text>
              <View className="settlement-upload-shell" onClick={handleUploadSettlementLogo}>
                <Text className="settlement-upload-title">
                  {settlementLogoUploading ? '上传中...' : settlementForm.logo ? '已上传 Logo 图片' : '点击上传 Logo 图片'}
                </Text>
                <Text className="settlement-upload-tip">
                  {settlementForm.logo || '上传成功后自动解析并回填 logo URL。'}
                </Text>
              </View>

              <Text className="settlement-field-label">*所在地区</Text>
              <View className="settlement-input-shell">
                <Input
                  className="settlement-input"
                  disabled
                  value="四川省 / 成都市"
                />
              </View>
              <Picker
                mode="selector"
                range={settlementDistricts}
                onChange={handleChooseSettlementDistrict}
                onCancel={handleCancelSettlementRegion}
              >
                <View className="settlement-input-shell">
                  <Input
                    className="settlement-input"
                    disabled
                    placeholder="请选择区县"
                    placeholderClass="settlement-placeholder"
                    value={settlementForm.district}
                  />
                </View>
              </Picker>

              <View className="settlement-modal-bottom-space" />
            </ScrollView>

            <View className="settlement-modal-footer">
              <Button
                className="settlement-submit-btn"
                loading={settlementSubmitting}
                disabled={settlementSubmitting}
                onClick={submitSettlementApply}
              >
                提交申请
              </Button>
            </View>
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
