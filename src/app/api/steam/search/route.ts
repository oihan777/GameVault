import { NextRequest, NextResponse } from 'next/server';

// =====================================================================================
// INTERFACES (Unificadas y Corregidas)
// =====================================================================================

/**
 * Interfaz para un juego de Steam, formateado para el frontend.
 * Unifica la estructura de datos de diferentes respuestas de la API de Steam.
 */
interface SteamGame {
  steamId: string;
  title: string;
  image: string;
  genres: string[];
  releaseDate: string;
  steamRating?: number;
  developers: string[];
  publishers: string[];
  price?: {
    currency: string;
    final: number;
    initial: number;
    discountPercent: number;
    formattedFinal: string;
    formattedInitial: string;
  };
  categories: string[];
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  description: string;
  isFree: boolean;
}

/**
 * Interfaz para la respuesta de la API de búsqueda de Steam.
 */
interface SteamSearchResponse {
  apps: Array<{
    appid: number;
    name: string;
    header_image: string;
  }>;
}

/**
 * Interfaz para la respuesta de la API de detalles de Steam.
 */
interface SteamAppDetailsResponse {
  [appid: string]: {
    data: {
      name: string;
      header_image: string;
      short_description: string;
      release_date: { date?: string };
      metacritic?: { score?: number };
      developers: Array<{ name: string }>;
      publishers: Array<{ name: string }>;
      price_overview?: {
        currency: string;
        initial: number;
        final: number;
        discount_percent: number;
        formattedFinal: string;
        formattedInitial: string;
      };
      categories: Array<{ description: string }>;
      platforms: {
        windows: boolean;
        mac: boolean;
        linux: boolean;
      };
      type: 'game' | 'software' | 'dlc' | 'music' | 'application';
    };
    success: boolean;
  };
}

// =====================================================================================
// CONSTANTES Y CONFIGURACIÓN
// =====================================================================================

const STEAM_API_BASE = 'https://store.steampowered.com';
const RESULTS_PER_PAGE = 50; // Más resultados para mayor precisión
const MAX_TOTAL_RESULTS = 250; // Límite para evitar bucles infinitos

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// =====================================================================================
// FUNCIONES AUXILIARES
// =====================================================================================

/**
 * Formatea los detalles de un juego de Steam a la interfaz unificada.
 * @param appDetails - Los detalles crudos de la API de Steam.
 * @param appId - El ID de la aplicación.
 * @returns Un objeto SteamGame formateado o null si no es un juego.
 */
function formatGameDetails(appDetails: any, appId: string): SteamGame | null {
  if (!appDetails?.success || appDetails.data.type !== 'game') {
    return null;
  }

  const { data } = appDetails;

  return {
    steamId: appId,
    title: data.name || 'Título desconocido',
    image: data.header_image || '',
    genres: data.categories?.map((c: any) => c.description) || [],
    releaseDate: data.release_date?.date ? new Date(data.release_date.date).getFullYear().toString() : 'Desconocido',
    steamRating: data.metacritic?.score,
    developers: data.developers?.map((d: any) => d.name) || [],
    publishers: data.publishers?.map((p: any) => p.name) || [],
    price: data.price_overview, // <-- Se devuelve el objeto de precio en bruto
    categories: data.categories?.map((c: any) => c.description) || [],
    platforms: data.platforms || { windows: false, mac: false, linux: false },
    description: data.short_description || '',
    isFree: !data.price_overview || data.price_overview.final === 0,
  };
}

/**
 * Obtiene los detalles de múltiples juegos a la vez.
 * Es mucho más eficiente que hacer una llamada por juego.
 * @param appIds - Array de IDs de aplicaciones.
 * @returns Una promesa que resuelve a un mapa de detalles.
 */
async function getGameDetailsBatch(appIds: string[]): Promise<Map<string, SteamGame>> {
  if (appIds.length === 0) return new Map();

  const detailsUrl = `${STEAM_API_BASE}/api/appdetails?appids=${appIds.join(',')}&filters=price_overview%2Cbasic%2Ccategories&l=spanish&cc=ES`;
  
  try {
    const response = await fetch(detailsUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`Steam app details API request failed with status: ${response.status}`);
    }
    const detailsData: SteamAppDetailsResponse = await response.json();
    
    const detailsMap = new Map<string, SteamGame>();
    for (const appId of appIds) {
      const details = detailsData[appId];
      if (details?.success) {
        const formattedGame = formatGameDetails(details, appId);
        if (formattedGame) {
          detailsMap.set(appId, formattedGame);
        }
      }
    }
    return detailsMap;
  } catch (error) {
    console.error('Error fetching batch game details:', error);
    return new Map(); // Devuelve un mapa vacío en caso de error
  }
}

// =====================================================================================
// LÓGICA DE BÚSQUEDA PRINCIPAL (Optimizada)
// =====================================================================================

/**
 * Busca juegos en la API de Steam Store.
 * Ahora obtiene más resultados usando paginación.
 * @param query - Término de búsqueda.
 * @returns Una promesa que resuelve a un array de juegos.
 */
async function searchSteamStore(query: string): Promise<SteamGame[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  let allGames: SteamGame[] = [];
  let page = 1;
  let hasMoreResults = true;

  while (hasMoreResults && allGames.length < MAX_TOTAL_RESULTS) {
    const searchUrl = `${STEAM_API_BASE}/api/storesearch/?term=${encodeURIComponent(query)}&l=spanish&cc=ES&category1=9980&supportedlang=spanish&exclude_content_descriptors=1&f=games&os=win&ndl=1&page=${page}`;
    
    try {
      const response = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });

      if (!response.ok) {
        throw new Error(`Steam search API request failed with status: ${response.status}`);
      }

      const searchData: SteamSearchResponse = await response.json();
      const rawResults = searchData.apps || [];

      // Formatear y añadir los resultados de esta página
      const newGames = rawResults.map(app => formatGameDetails({ data: { success: true, data: app }, appid: app.appid.toString() })).filter(Boolean) as SteamGame[];
      allGames = [...allGames, ...newGames];
      
      hasMoreResults = rawResults.length === RESULTS_PER_PAGE;
      page++;

    } catch (error) {
      console.error('Error fetching search page:', error);
      hasMoreResults = false; // Detener el bucle si hay un error
    }
  }

  return allGames;
}

// =====================================================================================
// LÓGICA DE BÚSQUEDA ALTERNATIVA (Fallback con Advertencia)
// =====================================================================================

/**
 * Búsqueda alternativa usando scraping del HTML.
 * MÉTODO NO RECOMENDADO: Lento, frágil y propenso a romperse.
 * Se mantiene solo como fallback si la búsqueda principal falla.
 */
async function searchSteamAlternative(query: string): Promise<SteamGame[]> {
  console.warn('Using alternative search method. This is slow and may break if Steam updates its website.');
  
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const searchUrl = `${STEAM_API_BASE}/search/results/?term=${encodeURIComponent(query)}&category1=9980&supportedlang=spanish&ndl=1`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`Alternative search failed with status: ${response.status}`);
    }

    const html = await response.text();
    const appIdRegex = /data-ds-appid="(\d+)"/g;
    const matches = [...html.matchAll(appIdRegex)];
    const appIds = [...new Set(matches.map(match => match[1]))].slice(0, RESULTS_PER_PAGE);

    if (appIds.length === 0) {
      return [];
    }

    // Obtener detalles de forma eficiente (usando la función de lotes)
    const detailsMap = await getGameDetailsBatch(appIds);
    
    return appIds.map(id => detailsMap.get(id)).filter(Boolean) as SteamGame[];
    
  } catch (error) {
    console.error('Alternative search error:', error);
    return [];
  }
}


// =====================================================================================
// FUNCIÓN PRINCIPAL DE LA RUTA API
// =====================================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query parameter must be at least 2 characters' }, { status: 400 });
  }

  try {
    // 1. Intentar la búsqueda principal y optimizada primero
    let games = await searchSteamStore(query);
    
    // 2. Si no hay resultados, usar el fallback (con advertencia en la consola)
    if (games.length === 0) {
      games = await searchSteamAlternative(query);
    }

    return NextResponse.json({ games });
  } catch (error) {
    console.error('Steam API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch games from Steam API', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}
