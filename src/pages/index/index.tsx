import markerIcon from '@/assets/icons/marker.png';
import markerIconRed from '@/assets/icons/marker-red.png';
import {View, Text, Map, Image, ScrollView} from '@tarojs/components';
import Taro from '@tarojs/taro';
import {useEffect, useState} from 'react';
import './index.less';


const HomePage = () => {
  /* ================== 基础状态 ================== */
  const [searchValue, setSearchValue] = useState('');
  const [locationName, setLocationName] = useState('成都市');

  // 默认成都中心，防止初始白屏
  const [latitude, setLatitude] = useState(30.65984);
  const [longitude, setLongitude] = useState(104.06325);

  /* ================== Marker 数据 ================== */
  const [markers] = useState([
    // 中心大红点
    {
      id: 1,
      latitude: 30.65984,
      longitude: 104.06325,
      width: 48,
      height: 48,
      iconPath: markerIconRed,
      callout: {
        content: 'POWER FLOW',
        color: '#ffffff',
        fontSize: 14,
        bgColor: '#000000',
        display: 'ALWAYS' as const,
        textAlign: 'center' as const
      }
    },
    // 周围橙色小点
    {
      id: 2,
      latitude: 30.66284,
      longitude: 104.06525,
      width: 32,
      height: 32,
      iconPath: markerIcon
    },
    {
      id: 3,
      latitude: 30.66084,
      longitude: 104.07125,
      width: 32,
      height: 32,
      iconPath: markerIcon
    },
    {
      id: 4,
      latitude: 30.65684,
      longitude: 104.05525,
      width: 32,
      height: 32,
      iconPath: markerIcon
    },
    {
      id: 5,
      latitude: 30.65384,
      longitude: 104.06825,
      width: 32,
      height: 32,
      iconPath: markerIcon
    },
    {
      id: 6,
      latitude: 30.66384,
      longitude: 104.05925,
      width: 32,
      height: 32,
      iconPath: markerIcon
    },
    {
      id: 7,
      latitude: 30.65584,
      longitude: 104.05025,
      width: 32,
      height: 32,
      iconPath: markerIcon
    }
  ] as any);

  /* ================== 生命周期 ================== */
  useEffect(() => {
    getLocation();
  }, []);

  /* ================== 定位 ================== */
  const getLocation = () => {
    Taro.getSetting({
      success(res) {
        if (res.authSetting['scope.userLocation']) {
          fetchLocation();
        } else {
          Taro.authorize({
            scope: 'scope.userLocation',
            success: fetchLocation,
            fail: () => {
              console.warn('用户拒绝定位');
            }
          });
        }
      }
    });
  };

  const fetchLocation = () => {
    Taro.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success(res) {
        setLatitude(res.latitude);
        setLongitude(res.longitude);
        reverseGeocoder(res.latitude, res.longitude);
      },
      fail(err) {
        console.error('定位失败', err);
      }
    });
  };

  /* ================== 逆地理编码 ================== */
  const reverseGeocoder = (lat: number, lng: number) => {
    Taro.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: {
        location: `${lat},${lng}`,
        key: '4C6BZ-O47Y7-SOZX7-HM46J-TPRQV-TGFHX',
        get_poi: 0
      },
      success(res) {
        const data = res.data;
        if (data && data.status === 0) {
          const city =
            data.result.address_component.city ||
            data.result.address_component.district;
          setLocationName(city);
        }
      }
    });
  };

  /* ================== 回到当前位置 ================== */
  const handleBackToLocation = () => {
    const ctx = Taro.createMapContext('mainMap');
    ctx.moveToLocation({
      success: () => {
        console.log('移动到当前位置成功');
      }
    });
  };

  /* ================== Render ================== */
  return (
    <View className='map-home'>

      {/* ================= 地图 ================= */}
      <Map
        id='mainMap'
        className='map-view'
        latitude={latitude}
        longitude={longitude}
        scale={15}
        markers={markers}
        showLocation
        enable3D
        enableRotate
        onError={(e) => {
          console.error('地图错误:', e);
        }}
        layer-style="1"
        subkey='4C6BZ-O47Y7-SOZX7-HM46J-TPRQV-TGFHX'
      />

      {/* ================= 顶部悬浮 ================= */}
      <View className='header-wrapper'>
        <View className='search-bar-floating'>
          
          {/* 1. 城市 */}
          <View className='city-select' onClick={getLocation}>
            <Text className='city-name'>{locationName}</Text>
            <Text className='arrow'>▼</Text>
          </View>

          {/* 2. 搜索 */}
          <View className='search-input-box'>
            <Text>搜索</Text>
          </View>

          {/* 3. 二维码 */}
          <View className='qr-btn'>
            <Text>二维码</Text>
          </View>
        </View>

        {/* 筛选栏 */}
        <View className='filter-bar'>
          <View className='filter-item'>全部 ▼</View>
          <View className='filter-item'>区域 ▼</View>
          <View className='filter-item'>更多筛选 ▼</View>
        </View>
      </View>

      {/* ================= 右侧悬浮按钮 ================= */}
      <View className='floating-controls'>
        <View className='control-btn' onClick={handleBackToLocation}>
          <Text className='control-text'>定位</Text>
        </View>
        <View className='control-btn list-mode'>
          <Text className='control-icon'>≡</Text>
          <Text className='control-text'>查看列表</Text>
        </View>
      </View>

      {/* ================= 底部卡片 ================= */}
      <View className='bottom-panel'>
        <ScrollView
          scrollX
          className='store-scroll'
          showScrollbar={false}
          enableFlex
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* 卡片1 */}
          <View className='store-card'>
            <View className='card-img-box'>
              <Image
                src='https://images.unsplash.com/photo-1574169208507-84376144848b?w=500'
                className='card-img'
                mode='aspectFill'
              />
              <View className='price-tag'>65¥起</View>
              <View className='date-tag'>6.10</View>
            </View>

            <View className='card-info'>
              <Text className='title'>Power Flow嘻哈与电子音乐结合</Text>

              <View className='tags'>
                <Text className='tag'>HipHop</Text>
                <Text className='tag'>电子</Text>
                <Text className='tag'>早鸟票</Text>
                <Text className='tag'>鸡尾酒</Text>
              </View>

              <View className='footer'>
                <View className='user'>
                  <View className='avatar'/>
                  <View className='user-info'>
                    <Text className='name'>PURE LOOP</Text>
                    <Text className='fans'>5234粉丝</Text>
                  </View>
                </View>
                <View className='action-btns'>
                  <View className='btn subscribe'>订阅</View>
                  <View className='btn route'>路线</View>
                </View>
              </View>
            </View>
          </View>

          {/* 卡片2 */}
          <View className='store-card'>
            <View className='card-img-box'>
              <Image
                src='https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=500'
                className='card-img'
                mode='aspectFill'
              />
              <View className='price-tag'>88¥起</View>
              <View className='date-tag'>6.15</View>
            </View>

            <View className='card-info'>
              <Text className='title'>夏日电音节 Summer Beat</Text>

              <View className='tags'>
                <Text className='tag'>EDM</Text>
                <Text className='tag'>House</Text>
                <Text className='tag'>预售</Text>
              </View>

              <View className='footer'>
                <View className='user'>
                  <View className='avatar' style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}/>
                  <View className='user-info'>
                    <Text className='name'>BEAT ZONE</Text>
                    <Text className='fans'>8921粉丝</Text>
                  </View>
                </View>
                <View className='action-btns'>
                  <View className='btn subscribe'>订阅</View>
                  <View className='btn route'>路线</View>
                </View>
              </View>
            </View>
          </View>

          {/* 卡片3 */}
          <View className='store-card'>
            <View className='card-img-box'>
              <Image
                src='https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500'
                className='card-img'
                mode='aspectFill'
              />
              <View className='price-tag'>120¥起</View>
              <View className='date-tag'>6.20</View>
            </View>

            <View className='card-info'>
              <Text className='title'>Techno Underground 地下派对</Text>

              <View className='tags'>
                <Text className='tag'>Techno</Text>
                <Text className='tag'>深夜场</Text>
                <Text className='tag'>限量</Text>
              </View>

              <View className='footer'>
                <View className='user'>
                  <View className='avatar' style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}/>
                  <View className='user-info'>
                    <Text className='name'>NEON CLUB</Text>
                    <Text className='fans'>12.5K粉丝</Text>
                  </View>
                </View>
                <View className='action-btns'>
                  <View className='btn subscribe'>订阅</View>
                  <View className='btn route'>路线</View>
                </View>
              </View>
            </View>
          </View>

          {/* 卡片4 */}
          <View className='store-card'>
            <View className='card-img-box'>
              <Image
                src='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500'
                className='card-img'
                mode='aspectFill'
              />
              <View className='price-tag'>50¥起</View>
              <View className='date-tag'>6.25</View>
            </View>

            <View className='card-info'>
              <Text className='title'>复古迪斯科之夜 Retro Disco</Text>

              <View className='tags'>
                <Text className='tag'>Disco</Text>
                <Text className='tag'>复古</Text>
                <Text className='tag'>学生票</Text>
              </View>

              <View className='footer'>
                <View className='user'>
                  <View className='avatar' style={{background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'}}/>
                  <View className='user-info'>
                    <Text className='name'>RETRO BAR</Text>
                    <Text className='fans'>6789粉丝</Text>
                  </View>
                </View>
                <View className='action-btns'>
                  <View className='btn subscribe'>订阅</View>
                  <View className='btn route'>路线</View>
                </View>
              </View>
            </View>
          </View>

          {/* 卡片5 */}
          <View className='store-card'>
            <View className='card-img-box'>
              <Image
                src='https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500'
                className='card-img'
                mode='aspectFill'
              />
              <View className='price-tag'>98¥起</View>
              <View className='date-tag'>6.30</View>
            </View>

            <View className='card-info'>
              <Text className='title'>爵士之夜 Jazz Lounge</Text>

              <View className='tags'>
                <Text className='tag'>Jazz</Text>
                <Text className='tag'>现场</Text>
                <Text className='tag'>含餐</Text>
              </View>

              <View className='footer'>
                <View className='user'>
                  <View className='avatar' style={{background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'}}/>
                  <View className='user-info'>
                    <Text className='name'>SMOOTH BAR</Text>
                    <Text className='fans'>4532粉丝</Text>
                  </View>
                </View>
                <View className='action-btns'>
                  <View className='btn subscribe'>订阅</View>
                  <View className='btn route'>路线</View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

    </View>
  );
};

export default HomePage;
