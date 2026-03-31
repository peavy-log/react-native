import { Appearance, Platform } from 'react-native';
import { EventState } from './constants/EventState';
import { Debug } from './Debug';
import { Device } from './Device';
import type { Peavy } from './Peavy';

export class EventStateReporter {
  constructor(private peavy: Peavy) {}

  sendState(): void {
    this.attempt(() => this.reportAppVersion());
    this.attempt(() => this.reportDeviceInfo());
    this.attempt(() => this.reportDeviceLanguage());
    this.attempt(() => this.reportDeviceScreen());
    this.attempt(() => this.reportUiTheme());
    this.attempt(() => this.reportPlatformVersion());
  }

  private attempt(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      Debug.warnSome('Failed to collect state', e as Error);
    }
  }

  private reportAppVersion(): void {
    const appVersion = Device.getAppVersion();
    this.peavy.state(EventState.AppVersion, appVersion.name);
    if (appVersion.code) {
      this.peavy.state(EventState.AppVersionCode, appVersion.code);
    }
  }

  private reportDeviceInfo(): void {
    const info = Device.getInfo();
    this.peavy.state(EventState.DeviceModel, info.deviceModel);
  }

  private reportDeviceLanguage(): void {
    const info = Device.getInfo();
    this.peavy.state(EventState.DeviceLanguage, info.deviceLanguage);
  }

  private reportDeviceScreen(): void {
    const info = Device.getInfo();
    this.peavy.state(EventState.DeviceScreenWidth, info.screenWidth);
    this.peavy.state(EventState.DeviceScreenHeight, info.screenHeight);
  }

  private reportUiTheme(): void {
    const colorScheme = Appearance.getColorScheme();
    this.peavy.state(EventState.UiTheme, colorScheme === 'dark' ? 'dark' : 'light');
  }

  private reportPlatformVersion(): void {
    const version = String(Platform.Version);
    this.peavy.state(EventState.PlatformVersion, version);
  }
}
