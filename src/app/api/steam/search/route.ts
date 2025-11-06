import { NextRequest, NextResponse } from 'next/server';

// =====================================================================================
// CONSTANTES Y CONFIGURACIÓN
// =====================================================================================

const STEAM_API_BASE = 'https://store.steampowered.com';
const RESULTS_PER_PAGE = 50; // Reducido de 50 a 250 para ser más realista
const MAX_TOTAL_RESULTS = 250; // Límite para evitar bucles infinitos
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// =====================================================================================
// INTERFACES (Tipado Mejorado)
// =====================================================================================

/**
 * Interfaz para los resultados de la búsqueda de Steam.
 */
interface SteamSearchResult {
  appid: number;
  name: string;
  header_image: string;
}

/**
 * Interfaz para los detalles de una aplicación de Steam.
 */
interface SteamAppDetails {
  data: {
    name: string;
    header_image: string;
    short_description: string;
    release_date: { date?: string };
    metacritic?: { score?: number };
    developers?: Array<{ name: string }>;
    publishers?: Array<{ name: string }>;
    price_overview?: {
      currency: string;
      initial: number;
      final: number;
      discount_percent: number;
      formattedFinal: string;
      formattedInitial: string;
    };
    categories?: Array<{ description: string }>;
    platforms?: { windows: boolean; mac: boolean; linux: boolean };
    type: 'game' | 'software' | 'dlc' | 'music' | 'application';
  };
  success: boolean;
}

/**
 * Interfaz unificada para un juego de Steam, optimizada para el frontend.
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
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  description: string;
  isFree: boolean;
}

// =====================================================================================
// FUNCIONES AUXILIARES
// =====================================================================================

/**
 * Formatea los detalles de un juego de Steam en la interfaz unificada.
 * @param appDetails - Los detalles crudos de la API de Steam.
 * @param appId - El ID de la aplicación.
 * @returns Un objeto SteamGame formateado o null si no es un juego.
 */
function formatGameDetails(appDetails: any, appId: string): SteamGame | null {
  if (!appDetails?.success || appDetails.data.type !== 'game') {
    return null; // Ignorar DLCs, software, etc.
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
 * Realiza una petición fetch con configuración por defecto y manejo de errores.
 * @param url - La URL a la que se va a realizar la petición.
 * @param options - Opciones adicionales para la petición.
 * @returns La respuesta de la petición.
 */
async function fetchWithDefaults(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    console.error(`Fetch failed for ${url}:`, error);
    throw new Error(`Fetch failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =====================================================================================
// LÓGICA DE BÚSQUEDA (Optimizada y Robusta)
// =====================================================================================

/**
 * Busca juegos en la API de Steam Store con paginación.
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

  try {
    while (hasMoreResults && allGames.length < MAX_TOTAL_RESULTS) {
      const searchUrl = `${STEAM_API_BASE}/api/storesearch/?term=${encodeURIComponent(query)}&l=spanish&cc=ES&category1=9980&supportedlang=spanish&exclude_content_descriptors=1&f=games&os=win&page=${page}&ndl=1`;
      
      const response = await fetchWithDefaults(searchUrl);
      const searchData = await response.json();
      
      const rawResults = searchData.items || [];
      const newGames = rawResults.map(result => formatGameDetails({ data: { success: true, ...result }, appid: result.appid.toString() })).filter(Boolean) as SteamGame[];
      
      allGames = [...allGames, ...newGames];
      hasMoreResults = rawResults.length === RESULTS_PER_PAGE;
      page++;
    }
  } catch (error) {
    console.error('Steam Store API error:', error);
    // En caso de error, devolver lo que se tenga hasta ahora
    return allGames;
  }

  return allGames;
}

/**
 * Búsqueda alternativa usando scraping (Fallback con advertencia).
 * @param query - Término de búsqueda.
 * @returns Una promesa que resuelve a un array de juegos.
 */
async function searchSteamAlternative(query: string): Promise<SteamGame[]> {
  console.warn('Using alternative search method. This is slow and may break if Steam updates its website.');
  
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const searchUrl = `${STEAM_API_BASE}/search/results/?term=${encodeURIComponent(query)}&category1=9980&supportedlang=spanish&ndl=1`;
    const response = await fetchWithDefaults(searchUrl, {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    });
    
    const html = await response.text();
    const appIdRegex = /data-ds-appid="(\d+)"/g;
    const matches = [...html.matchAll(appIdRegex)];
    const appIds = [...new Set(matches.map(match => match[1]))].slice(0, RESULTS_PER_PAGE);
    
    if (appIds.length === 0) {
      return [];
    }

    const detailsUrl = `${STEAM_API_BASE}/api/appdetails?appids=${appIds.join(',')}&filters=price_overview%2Cbasic%2Ccategories&l=spanish&cc=ES`;
    const detailsResponse = await fetchWithDefaults(detailsUrl);
    const detailsData = await detailsResponse.json();

    return appIds.map(appId => {
      const details = detailsData[appId];
      return formatGameDetails(details, appId);
    }).filter(Boolean) as SteamGame[];
  } catch (error) {
    console.error('Alternative search error:', error);
    return [];
  }
}

// =====================================================================================
// FUNCIÓN PRINCIPAL DE LA RUTA API
// =====================================================================================

/**
 * Maneja las solicitudes de búsqueda de juegos de Steam.
 * Combina la búsqueda principal y la alternativa como fallback.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query parameter must be at least 2 characters' }, { status: 400 });
  }

  try {
    // 1. Intentar la búsqueda principal y optimizada primero
    let games = await searchSteamStore(query);
    
    // 2. Si no hay resultados, usar el método alternativo (con advertencia)
    if (games.length === 0) {
      console.log('Primary search found no results, trying alternative method...');
      games = await searchSteamAlternative(query);
    }

    return NextResponse.json({ games });
  } catch (error) {
    console.error('Steam API error:', error);
    
    // Devuelve un error más descriptivo para facilitar la depuración
    return NextResponse.json(
      { 
        error: 'Failed to fetch games from Steam API', 
        details: error instanceof Error ? error.message : 'An unexpected error occurred while searching for games.' 
      }, 
      { status: 500 }
    );
  }
}
