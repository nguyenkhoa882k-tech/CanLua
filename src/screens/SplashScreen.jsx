import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function SplashScreen() {
  const navigation = useNavigation();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();

    const t = setTimeout(() => {
      navigation.replace('Main');
    }, 2000);
    return () => clearTimeout(t);
  }, [navigation]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#10b981' }}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }, { rotate }],
          opacity: fadeAnim,
        }}
        className="items-center"
      >
        <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
          <Text className="text-5xl">🌾</Text>
        </View>
        <Text className="text-3xl font-bold text-white mb-2">Cân Lúa</Text>
        <Text className="text-white text-base" style={{ opacity: 0.9 }}>Quản lý mua bán lúa gạo</Text>
      </Animated.View>
    </View>
  );
}
