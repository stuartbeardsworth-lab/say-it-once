// Which kind of device the app is running on.
//
// Say It Once is one codebase in three places: the Netlify site, a
// home-screen web app, and the iPhone and Android apps built with Capacitor.
// Almost everything is identical. The few things that can't be (handing a
// finished file to the person, updates, the hardware Back button) ask here
// first, so the web behaviour is never changed by accident.

import { Capacitor } from '@capacitor/core';

export type Platform = 'ios' | 'android' | 'web';

/** True only inside the iPhone or Android app, never in a browser. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function platform(): Platform {
  const name = Capacitor.getPlatform();
  return name === 'ios' || name === 'android' ? name : 'web';
}
