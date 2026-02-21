import { useEffect } from 'react';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

let adLoadCount = 0;

export const useInterstitialAd = () => {
  useEffect(() => {
    // Only show ads in development mode
    if (!__DEV__) {
      return;
    }

    adLoadCount++;

    // Show ad every 3rd screen visit
    if (adLoadCount % 3 === 0) {
      const interstitial = InterstitialAd.createForAdRequest(
        TestIds.INTERSTITIAL,
        {
          requestNonPersonalizedAdsOnly: true,
        },
      );

      const unsubscribeLoaded = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          interstitial.show();
        },
      );

      const unsubscribeClosed = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          // Ad closed
        },
      );

      interstitial.load();

      return () => {
        unsubscribeLoaded();
        unsubscribeClosed();
      };
    }
  }, []);
};
