import { NextRequest, NextResponse } from 'next/server';

// --- Interfaces de Datos de Steam (Más limpias) ---
interface SteamSearchResult {
  id: number;
  name: string;
  header_image: string;
}

interface SteamAppDetails {
  [appid: string]: {
    data: {
      name: string;
      header_image: string;
      short_description: string;
      release_date: string; // <-- CAMBIO: Ahora es un string directo
      metacritic?: { score: number };
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
      platforms?: {
        windows: boolean;
        mac: boolean;
        linux: boolean;
      };
      type: 'game' | 'software' | 'dlc' | 'music' | 'application';
    };
    success: boolean;
  };
}

// --- Función para obtener detalles con retraso (para evitar Rate Limiting) ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Función para obtener detalles por lotes ---
async function getAppDetailsBatch(appIds: string[]): Promise<SteamAppDetails> {
  const details: SteamAppDetails = {};
  
  // Dividimos los IDs en lotes de 5 para no sobrecargar la API
  const batchSize = 5;
  for (let i = 0; i < appIds.length; i += batchSize) {
    const batch = appIds.slice(i, i + batchSize);
    
    const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${batch.join(',')}&filters=price_overview%2Cbasic%2Ccategories&l=spanish&cc=ES`;
    const response = await fetch(detailsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.ok) {
      const batchDetails = await response.json();
      Object.assign(details, batchDetails);
    }
    
    // Pequeña pausa entre lotes para ser amable con la API
    if (i + batchSize < appIds.length) {
      await sleep(1000); // Esperar 1 segundo entre cada lote
    }
  }
  
  return details;
}

// --- Función principal de búsqueda (Robusta y eficiente) ---
async function searchSteamStore(query: string): Promise<any[]> {
  const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=spanish&cc=ES&category1=9980&supportedlang=spanish&exclude_content_descriptors=1&f=games&os=win&page=1&ndl=1`;
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  // --- Mejor Manejo de Errores ---
  if (!response.ok) {
    // Si la API falla, devolvemos un array vacío en lugar de lanzar un error.
    // Esto evita que la aplicación se rompa y permite que el frontend muestre un mensaje.
    console.error(`Steam search API request failed with status: ${response.status}. This is likely due to rate limiting.`);
    return [];
  }

  const searchData = await response.json();
  return searchData.items || [];
}

// --- Función principal de la ruta API ---
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query parameter must be at least 2 characters' }, { status: 400 });
  }

  try {
    // 1. Hacer la búsqueda principal a la API de Steam
    const searchResults = await searchSteamStore(query);

    if (searchResults.length === 0) {
      return NextResponse.json({ games: [], total: 0, query: query });
    }

    // 2. Extraer los IDs de los juegos encontrados
    const gameIds = searchResults.map((result: SteamSearchResult) => result.id.toString());

    // 3. Obtener los detalles de todos los juegos de forma eficiente (en lotes)
    const detailsData = await getAppDetailsBatch(gameIds);

    // 4. Formatear la respuesta final para el frontend
    const formattedGames = searchResults.map((result: SteamSearchResult) => {
      const details = detailsData[result.id];
      if (!details?.success || details.data.type !== 'game') {
        return null; // Ignoramos DLCs, software, etc.
      }

      const { data } = details;

      return {
        steamId: result.id.toString(),
        title: data.name,
        image: data.header_image,
        genres: data.categories?.map((c: any) => c.description) || [],
        // --- CORRECCIÓN DE LA FECHA ---
        releaseDate: data.release_date ? new Date(data.release_date).getFullYear().toString() : 'Unknown',
        steamRating: data.metacritic?.score,
        developers: data.developers?.map((d: any) => d.name) || [],
        publishers: data.publishers?.map((p: any) => p.name) || [],
        price: data.price_overview, // Devolvemos el objeto de precio en bruto
        categories: data.categories?.map((c: any) => c.description) || [],
        platforms: data.platforms || { windows: false, mac: false, linux: false },
        description: data.short_description,
        isFree: !data.price_overview || data.price_overview.final === 0,
      };
    }).filter(Boolean);

    return NextResponse.json({
      games: formattedGames,
      total: formattedGames.length,
      query: query,
    });
  } catch (error) {
    console.error('Steam API error:', error);
    // Devolvemos un error 500 solo si es un fallo grave del servidor
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while searching for games.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
