// src/app/api/steamSearch.ts
import { NextRequest, NextResponse } from 'next/server';

interface SteamGameRaw {
  appid: number;
  name: string;
  header_image: string;
  genres?: Array<{ id: number; description: string }>;
  release_date?: { date: string; coming_soon: boolean };
  metacritic?: { score: number; url: string };
  developers?: Array<string>;
  publishers?: Array<string>;
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
  };
  categories?: Array<{ id: number; description: string }>;
  platforms?: { windows: boolean; mac: boolean; linux: boolean };
  short_description: string;
}

interface SteamSearchResponse {
  apps: Array<{ appid: number; name: string }>;
}

interface SteamAppDetailsResponse {
  [appid: string]: {
    data: SteamGameRaw;
    success: boolean;
  };
}

// Simple in-memory cache to avoid re-fetching same appids repeatedly
const detailsCache: Map<number, SteamGameRaw> = new Map();

const convertToEUR = (price: number, currency: string): number => {
  const exchangeRates: { [key: string]: number } = {
    USD: 0.92,
    GBP: 1.17,
    EUR: 1.0,
    // … otros
  };
  const rate = exchangeRates[currency] ?? 0.92;
  return price * rate;
};

const formatEUR = (price: number): string => `€${price.toFixed(2)}`;

// Get detailed info for multiple appIds
async function fetchGameDetails(appIds: number[]): Promise<SteamGameRaw[]> {
  const uniqueIds = Array.from(new Set(appIds));
  const idsToFetch = uniqueIds.filter(id => !detailsCache.has(id));
  if (idsToFetch.length > 0) {
    const idParam = idsToFetch.join(',');
    const url = `https://store.steampowered.com/api/appdetails?appids=${idParam}&l=english`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (resp.ok) {
      const data: SteamAppDetailsResponse = await resp.json();
      for (const idStr of Object.keys(data)) {
        const entry = data[idStr];
        if (entry.success) {
          detailsCache.set(Number(idStr), entry.data);
        }
      }
    } else {
      console.warn('Steam details API call failed', resp.status);
    }
  }
  // Return from cache all requested
  return uniqueIds.map(id => detailsCache.get(id)!).filter(Boolean);
}

async function searchSteamStore(query: string, limit = 10): Promise<SteamGameRaw[]> {
  const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`;
  const resp = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  if (!resp.ok) throw new Error('Steam search API failed');
  const searchData: SteamSearchResponse = await resp.json();
  const apps = searchData.apps.slice(0, limit);
  const appIds = apps.map(a => a.appid);
  const details = await fetchGameDetails(appIds);
  return details;
}

async function searchSteamAlternative(query: string, limit = 5): Promise<SteamGameRaw[]> {
  const searchUrl = `https://store.steampowered.com/search/results/?term=${encodeURIComponent(query)}&category1=998&supportedlang=english&ndl=1`;
  const resp = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'text/html'
    }
  });
  if (!resp.ok) throw new Error('Alternative search failed');
  const html = await resp.text();
  const appIdRegex = /data-ds-appid="(\d+)"/g;
  const matches = [...html.matchAll(appIdRegex)].map(m => Number(m[1]));
  const uniqueIds = Array.from(new Set(matches)).slice(0, limit);
  const details = await fetchGameDetails(uniqueIds);
  return details;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limitStr = searchParams.get('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : 10;

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query parameter must be at least 2 characters' }, { status: 400 });
  }

  try {
    let gamesRaw = await searchSteamStore(query, limit);

    if (gamesRaw.length === 0) {
      console.log('Trying alternative search method...');
      gamesRaw = await searchSteamAlternative(query, limit);
    }

    const formatted = gamesRaw.map(game => {
      let convertedPrice = null;
      if (game.price_overview) {
        const finalEUR = convertToEUR(game.price_overview.final / 100, game.price_overview.currency);
        const initialEUR = convertToEUR(game.price_overview.initial / 100, game.price_overview.currency);
        convertedPrice = {
          final: finalEUR,
          initial: initialEUR,
          discountPercent: game.price_overview.discount_percent,
          currency: 'EUR',
          formattedFinal: formatEUR(finalEUR),
          formattedInitial: formatEUR(initialEUR)
        };
      }
      return {
        steamId: game.appid.toString(),
        title: game.name,
        image: game.header_image,
        genres: (game.genres ?? []).map(g => g.description),
        releaseDate: game.release_date?.date ? new Date(game.release_date.date).getFullYear().toString() : 'Unknown',
        steamRating: game.metacritic?.score ?? null,
        developers: game.developers ?? [],
        publishers: game.publishers ?? [],
        price: convertedPrice,
        categories: (game.categories ?? []).map(c => c.description),
        platforms: game.platforms ?? { windows: false, mac: false, linux: false },
        description: game.short_description,
        isFree: !game.price_overview || game.price_overview.final === 0
      };
    });

    return NextResponse.json({ games: formatted, total: formatted.length, query });
  } catch (error: any) {
    console.error('Steam API error:', error);
    return NextResponse.json({ error: 'Failed to fetch games from Steam API', details: error.message }, { status: 500 });
  }
}
