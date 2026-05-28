/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IPTVChannel {
  id: string;
  name: string;
  logo?: string;
  url: string;
  urls?: string[];
  category: string;
  type: 'live' | 'movie' | 'series';
  isFavorite?: boolean;
}

export interface IPTVCategory {
  id: string;
  name: string;
  type: 'live' | 'movie' | 'series';
}

export interface IPTVConfig {
  type: 'm3u' | 'xtream';
  url: string; // File URL or Server URL
  username?: string;
  password?: string;
  port?: string;
}

export interface UserSession {
  uid: string;
  config: IPTVConfig | null;
}
