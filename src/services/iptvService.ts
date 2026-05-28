/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import { IPTVChannel } from '../types';

export async function fetchXtreamChannels(config: { url: string, user: string, pass: string }): Promise<IPTVChannel[]> {
  const { url, user, pass } = config;
  
  const apiBase = `/api/proxy?url=${encodeURIComponent(`${url}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`)}`;
  
  try {
    const response = await axios.get(apiBase);
    const data = response.data;
    
    return data.map((item: any) => ({
      id: item.stream_id.toString(),
      name: item.name,
      logo: item.stream_icon,
      url: `${url}/live/${user}/${pass}/${item.stream_id}.ts`,
      category: item.category_id,
      type: 'live'
    }));
  } catch (error) {
    console.error('Error fetching Xtream channels:', error);
    return [];
  }
}

export function parseM3U(content: string): IPTVChannel[] {
  const lines = content.split('\n');
  const channels: IPTVChannel[] = [];
  let currentChannel: Partial<IPTVChannel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo="(.*?)"/);
      const groupMatch = line.match(/group-title="(.*?)"/);
      const tvgIdMatch = line.match(/tvg-id="(.*?)"/);
      const tvgNameMatch = line.match(/tvg-name="(.*?)"/);
      
      currentChannel.name = nameMatch ? nameMatch[1].trim() : (tvgNameMatch ? tvgNameMatch[1] : 'Canal Desconocido');
      currentChannel.logo = logoMatch ? logoMatch[1] : undefined;
      currentChannel.category = groupMatch ? groupMatch[1] : 'General';
      currentChannel.id = tvgIdMatch ? tvgIdMatch[1] : (currentChannel.name + Math.random().toString(36).substr(2, 5));
      
      // Improved heuristic for iptv-org and others
      const cLower = (currentChannel.category || '').toLowerCase();
      const nLower = (currentChannel.name || '').toLowerCase();
      
      if (cLower.includes('movie') || cLower.includes('película') || cLower.includes('vod') || nLower.includes('[pelicula]') || nLower.includes('[movie]')) {
        currentChannel.type = 'movie';
      } else if (cLower.includes('series') || nLower.includes('[serie]')) {
        currentChannel.type = 'series';
      } else {
        currentChannel.type = 'live';
      }
    } else if (line.startsWith('http')) {
      currentChannel.url = line;
      if (currentChannel.name) {
        channels.push(currentChannel as IPTVChannel);
      }
      currentChannel = {};
    }
  }

  return channels.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}
