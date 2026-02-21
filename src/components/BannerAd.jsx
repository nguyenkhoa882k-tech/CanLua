import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  BannerAd as GoogleBannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

// Real Google Mobile Ads Banner - Only show in development mode
export default function BannerAd() {
  // Only render in development mode
  if (!__DEV__) {
    return null;
  }

  const adUnitId = TestIds.ADAPTIVE_BANNER;

  return (
    <View style={styles.container}>
      <GoogleBannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
