import { Platform, Dimensions } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { AppVersion } from './options/PeavyOptions';

export interface DeviceInfoResult {
  platform: string;
  platformVersion: string;
  deviceModel: string;
  deviceLanguage: string;
  screenWidth: number;
  screenHeight: number;
  appId: string;
  appVersion: AppVersion;
}

export class Device {
  static getInfo(): DeviceInfoResult {
    const screen = Dimensions.get('screen');

    return {
      platform: Platform.OS,
      platformVersion: DeviceInfo.getSystemVersion(),
      deviceModel: DeviceInfo.getModel(),
      deviceLanguage: Device.getLanguage(),
      screenWidth: Math.round(screen.width),
      screenHeight: Math.round(screen.height),
      appId: DeviceInfo.getBundleId(),
      appVersion: {
        name: DeviceInfo.getVersion(),
        code: Number(DeviceInfo.getBuildNumber()) || undefined,
      },
    };
  }

  static getAppVersion(): AppVersion {
    return {
      name: DeviceInfo.getVersion(),
      code: Number(DeviceInfo.getBuildNumber()) || undefined,
    };
  }

  private static getLanguage(): string {
    // react-native-device-info doesn't expose a sync locale getter,
    // but we can use Platform-specific constants available in RN core.
    let locale = 'en';
    try {
      if (Platform.OS === 'ios') {
        const { SettingsManager } = require('react-native').NativeModules;
        locale =
          SettingsManager?.settings?.AppleLocale ||
          SettingsManager?.settings?.AppleLanguages?.[0] ||
          'en';
      } else if (Platform.OS === 'android') {
        const { I18nManager } = require('react-native').NativeModules;
        locale = I18nManager?.localeIdentifier || 'en';
      }
    } catch {
      // Fall back to 'en'
    }
    return locale.replace(/_/g, '-');
  }
}
