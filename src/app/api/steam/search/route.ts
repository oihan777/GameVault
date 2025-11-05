import { NextRequest, NextResponse } from 'next/server'

interface SteamGame {
  appid: number
  name: string
  header_image: string
  genres?: Array<{ id: number, description: string }>
  release_date?: { date: string, coming_soon: boolean }
  metacritic?: { score: number, url: string }
  developers?: Array<string>
  publishers?: Array<string>
  price_overview?: {
    currency: string
    initial: number
    final: number
    discount_percent: number
  }
  categories?: Array<{ id: number, description: string }>
  platforms?: {
    windows: boolean
    mac: boolean
    linux: boolean
  }
  short_description: string
}

interface SteamSearchResponse {
  apps: Array<{
    appid: number
    name: string
  }>
}

interface SteamAppDetailsResponse {
  [appid: string]: {
    data: SteamGame
    success: boolean
  }
}

// Función para convertir precios a euros (tasas de conversión aproximadas)
const convertToEUR = (price: number, currency: string): number => {
  const exchangeRates: { [key: string]: number } = {
    'USD': 0.92,     // 1 USD ≈ 0.92 EUR
    'GBP': 1.17,     // 1 GBP ≈ 1.17 EUR
    'EUR': 1.00,     // 1 EUR = 1 EUR
    'RUB': 0.010,    // 1 RUB ≈ 0.010 EUR
    'BRL': 0.18,     // 1 BRL ≈ 0.18 EUR
    'JPY': 0.0062,   // 1 JPY ≈ 0.0062 EUR
    'KRW': 0.00068,  // 1 KRW ≈ 0.00068 EUR
    'TRY': 0.028,    // 1 TRY ≈ 0.028 EUR
    'CNY': 0.13,     // 1 CNY ≈ 0.13 EUR
    'TWD': 0.029,    // 1 TWD ≈ 0.029 EUR
    'SGD': 0.68,     // 1 SGD ≈ 0.68 EUR
    'HKD': 0.12,     // 1 HKD ≈ 0.12 EUR
    'CAD': 0.68,     // 1 CAD ≈ 0.68 EUR
    'AUD': 0.62,     // 1 AUD ≈ 0.62 EUR
    'NZD': 0.57,     // 1 NZD ≈ 0.57 EUR
    'MXN': 0.054,    // 1 MXN ≈ 0.054 EUR
    'ARS': 0.0011,   // 1 ARS ≈ 0.0011 EUR
    'CLP': 0.0011,   // 1 CLP ≈ 0.0011 EUR
    'PEN': 0.26,     // 1 PEN ≈ 0.26 EUR
    'COP': 0.00023,  // 1 COP ≈ 0.00023 EUR
    'UYU': 0.024,    // 1 UYU ≈ 0.024 EUR
    'NOK': 0.087,    // 1 NOK ≈ 0.087 EUR
    'DKK': 0.13,     // 1 DKK ≈ 0.13 EUR
    'SEK': 0.087,    // 1 SEK ≈ 0.087 EUR
    'PLN': 0.23,     // 1 PLN ≈ 0.23 EUR
    'CHF': 1.03,     // 1 CHF ≈ 1.03 EUR
    'CZK': 0.039,    // 1 CZK ≈ 0.039 EUR
    'HUF': 0.0026,   // 1 HUF ≈ 0.0026 EUR
    'RON': 0.20,     // 1 RON ≈ 0.20 EUR
    'HRK': 0.13,     // 1 HRK ≈ 0.13 EUR
    'BGN': 0.51,     // 1 BGN ≈ 0.51 EUR
    'RSD': 0.0085,   // 1 RSD ≈ 0.0085 EUR
    'MYR': 0.20,     // 1 MYR ≈ 0.20 EUR
    'THB': 0.026,    // 1 THB ≈ 0.026 EUR
    'IDR': 0.000059, // 1 IDR ≈ 0.000059 EUR
    'VND': 0.000038, // 1 VND ≈ 0.000038 EUR
    'UAH': 0.025,    // 1 UAH ≈ 0.025 EUR
    'KZT': 0.0020,   // 1 KZT ≈ 0.0020 EUR
    'INR': 0.011,    // 1 INR ≈ 0.011 EUR
    'PKR': 0.0033,   // 1 PKR ≈ 0.0033 EUR
    'LKR': 0.0029,   // 1 LKR ≈ 0.0029 EUR
    'BDT': 0.0085,   // 1 BDT ≈ 0.0085 EUR
    'NPR': 0.0069,   // 1 NPR ≈ 0.0069 EUR
    'MMK': 0.00044,  // 1 MMK ≈ 0.00044 EUR
    'KHR': 0.00022,  // 1 KHR ≈ 0.00022 EUR
    'LAK': 0.000051, // 1 LAK ≈ 0.000051 EUR
    'MVR': 0.059,    // 1 MVR ≈ 0.059 EUR
    'PHP': 0.016,    // 1 PHP ≈ 0.016 EUR
    'MOP': 0.11,     // 1 MOP ≈ 0.11 EUR
    'TMT': 0.26,     // 1 TMT ≈ 0.26 EUR
    'GEL': 0.34,     // 1 GEL ≈ 0.34 EUR
    'AMD': 0.0019,   // 1 AMD ≈ 0.0019 EUR
    'AZN': 0.54,     // 1 AZN ≈ 0.54 EUR
    'KGS': 0.010,    // 1 KGS ≈ 0.010 EUR
    'UZS': 0.000075, // 1 UZS ≈ 0.000075 EUR
    'TJS': 0.089,    // 1 TJS ≈ 0.089 EUR
    'AFN': 0.010,    // 1 AFN ≈ 0.010 EUR
    'IRR': 0.000022, // 1 IRR ≈ 0.000022 EUR
    'IQD': 0.00070,  // 1 IQD ≈ 0.00070 EUR
    'JOD': 1.30,     // 1 JOD ≈ 1.30 EUR
    'SAR': 0.25,     // 1 SAR ≈ 0.25 EUR
    'YER': 0.0037,   // 1 YER ≈ 0.0037 EUR
    'OMR': 2.39,     // 1 OMR ≈ 2.39 EUR
    'BHD': 2.45,     // 1 BHD ≈ 2.45 EUR
    'QAR': 0.25,     // 1 QAR ≈ 0.25 EUR
    'AED': 0.25,     // 1 AED ≈ 0.25 EUR
    'KWD': 3.04,     // 1 KWD ≈ 3.04 EUR
    'LBP': 0.000061, // 1 LBP ≈ 0.000061 EUR
    'SYP': 0.0000074,// 1 SYP ≈ 0.0000074 EUR
    'ILS': 0.25,     // 1 ILS ≈ 0.25 EUR
    'EGP': 0.019,    // 1 EGP ≈ 0.019 EUR
    'DZD': 0.0069,   // 1 DZD ≈ 0.0069 EUR
    'TND': 0.30,     // 1 TND ≈ 0.30 EUR
    'MAD': 0.093,    // 1 MAD ≈ 0.093 EUR
    'LYD': 0.20,     // 1 LYD ≈ 0.20 EUR
    'GHS': 0.076,    // 1 GHS ≈ 0.076 EUR
    'NGN': 0.00061,  // 1 NGN ≈ 0.00061 EUR
    'XOF': 0.0015,   // 1 XOF ≈ 0.0015 EUR
    'XAF': 0.0015,   // 1 XAF ≈ 0.0015 EUR
    'XPF': 0.0084,   // 1 XPF ≈ 0.0084 EUR
    'VUV': 0.0075,   // 1 VUV ≈ 0.0075 EUR
    'WST': 0.34,     // 1 WST ≈ 0.34 EUR
    'SBD': 0.11,     // 1 SBD ≈ 0.11 EUR
    'FJD': 0.41,     // 1 FJD ≈ 0.41 EUR
    'TOP': 0.39,     // 1 TOP ≈ 0.39 EUR
    'PGK': 0.26,     // 1 PGK ≈ 0.26 EUR
    'SCR': 0.067,    // 1 SCR ≈ 0.067 EUR
    'MUR': 0.020,    // 1 MUR ≈ 0.020 EUR
    'KES': 0.0073,   // 1 KES ≈ 0.0073 EUR
    'TZS': 0.00038,  // 1 TZS ≈ 0.00038 EUR
    'UGX': 0.00025,  // 1 UGX ≈ 0.00025 EUR
    'RWF': 0.00085,  // 1 RWF ≈ 0.00085 EUR
    'BIF': 0.00034,  // 1 BIF ≈ 0.00034 EUR
    'DJF': 0.0052,   // 1 DJF ≈ 0.0052 EUR
    'ERN': 0.000061, // 1 ERN ≈ 0.000061 EUR
    'ETB': 0.016,    // 1 ETB ≈ 0.016 EUR
    'SOS': 0.0016,   // 1 SOM ≈ 0.0016 EUR
    'ZAR': 0.050,    // 1 ZAR ≈ 0.050 EUR
    'BWP': 0.069,    // 1 BWP ≈ 0.069 EUR
    'LSL': 0.050,    // 1 LSL ≈ 0.050 EUR
    'SZL': 0.050,    // 1 SZL ≈ 0.050 EUR
    'NAD': 0.050,    // 1 NAD ≈ 0.050 EUR
    'AOA': 0.0016,   // 1 AOA ≈ 0.0016 EUR
    'XCD': 0.34,     // 1 XCD ≈ 0.34 EUR
    'BBD': 0.46,     // 1 BBD ≈ 0.46 EUR
    'BSD': 0.92,     // 1 BSD ≈ 0.92 EUR
    'BZD': 0.46,     // 1 BZD ≈ 0.46 EUR
    'GTQ': 0.12,     // 1 GTQ ≈ 0.12 EUR
    'HNL': 0.037,    // 1 HNL ≈ 0.037 EUR
    'NIO': 0.025,    // 1 NIO ≈ 0.025 EUR
    'CRC': 0.0016,   // 1 CRC ≈ 0.0016 EUR
    'PAB': 0.92,     // 1 PAB ≈ 0.92 EUR
    'VEF': 0.000000091, // 1 VEF ≈ 0.000000091 EUR
    'GYD': 0.0044,   // 1 GYD ≈ 0.0044 EUR
    'SRD': 0.025,    // 1 SRD ≈ 0.025 EUR
    'TVD': 0.62      // 1 TVD ≈ 0.62 EUR
  };
  
  const rate = exchangeRates[currency] || 0.92; // Default to USD rate if currency not found
  return price * rate;
};

// Formatear precio en euros
const formatEUR = (price: number): string => {
  return `€${price.toFixed(2)}`;
};

// Función para buscar juegos usando Steam Store API
async function searchSteamStore(query: string): Promise<SteamGame[]> {
  try {
    // Primera búsqueda: Steam Store Search API
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!searchResponse.ok) {
      throw new Error('Steam search API failed')
    }
    
    const searchData: SteamSearchResponse = await searchResponse.json()
    
    // Obtener detalles para los primeros 10 juegos
    const appIds = (searchData?.apps ?? []).slice(0, 10).map(app => app.appid).join(',')
if (!appIds) {
  throw new Error("No se encontraron juegos en la búsqueda de Steam")
}
    const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appIds}&l=english`
    
    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!detailsResponse.ok) {
      throw new Error('Steam details API failed')
    }
    
    const detailsData: SteamAppDetailsResponse = await detailsResponse.json()
    
    // Formatear los resultados
    const games = searchData.apps.slice(0, 10).map(app => {
      const details = detailsData[app.appid]
      if (!details?.success || !details.data || details.data.type !== 'game') return null
      
      return {
        appid: app.appid,
        name: details.data.name,
        header_image: details.data.header_image,
        genres: details.data.genres || [],
        release_date: details.data.release_date,
        metacritic: details.data.metacritic,
        developers: details.data.developers || [],
        publishers: details.data.publishers || [],
        price_overview: details.data.price_overview,
        categories: details.data.categories || [],
        platforms: details.data.platforms || { windows: false, mac: false, linux: false },
        short_description: details.data.short_description
      }
    }).filter(Boolean)
    
    return games as SteamGame[]
  } catch (error) {
    console.error('Steam Store API error:', error)
    return []
  }
}

// Función de respaldo usando búsqueda alternativa
async function searchSteamAlternative(query: string): Promise<SteamGame[]> {
  try {
    // Usar búsqueda directa con parámetros más específicos
    const searchUrl = `https://store.steampowered.com/search/results/?term=${encodeURIComponent(query)}&category1=998&supportedlang=english&ndl=1`
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    if (!response.ok) {
      throw new Error('Alternative search failed')
    }
    
    // Extraer app IDs del HTML (método simple)
    const html = await response.text()
    const appIdRegex = /data-ds-appid="(\d+)"/g
    const matches = [...html.matchAll(appIdRegex)]
    const appIds = [...new Set(matches.map(match => match[1]))].slice(0, 5)
    
    // Obtener detalles para cada app ID
    const games = await Promise.all(
      appIds.map(async (appId) => {
        try {
          const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`
          const detailsResponse = await fetch(detailsUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })
          
          if (detailsResponse.ok) {
            const detailsData: SteamAppDetailsResponse = await detailsResponse.json()
            const details = detailsData[appId]
            
            if (details?.success && details.data?.type === 'game') {
              return {
                appid: parseInt(appId),
                name: details.data.name,
                header_image: details.data.header_image,
                genres: details.data.genres || [],
                release_date: details.data.release_date,
                metacritic: details.data.metacritic,
                developers: details.data.developers || [],
                publishers: details.data.publishers || [],
                price_overview: details.data.price_overview,
                categories: details.data.categories || [],
                platforms: details.data.platforms || { windows: false, mac: false, linux: false },
                short_description: details.data.short_description
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching details for app ${appId}:`, error)
        }
        return null
      })
    )
    
    return games.filter(Boolean) as SteamGame[]
  } catch (error) {
    console.error('Alternative API error:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query parameter must be at least 2 characters' }, { status: 400 })
  }

  try {
    // Intentar búsqueda principal primero
    let games = await searchSteamStore(query)
    
    // Si no hay resultados, intentar búsqueda alternativa
    if (games.length === 0) {
      console.log('Trying alternative search method...')
      games = await searchSteamAlternative(query)
    }
    
    // Formatear respuesta final
    const formattedGames = games.map(game => {
      // Convertir precios a euros
      let convertedPrice = null;
      if (game.price_overview) {
        const finalPriceEUR = convertToEUR(game.price_overview.final / 100, game.price_overview.currency);
        const initialPriceEUR = convertToEUR(game.price_overview.initial / 100, game.price_overview.currency);
        
        convertedPrice = {
          final: finalPriceEUR,
          initial: initialPriceEUR,
          discountPercent: game.price_overview.discount_percent,
          currency: 'EUR',
          formattedFinal: formatEUR(finalPriceEUR),
          formattedInitial: formatEUR(initialPriceEUR)
        };
      }

      return {
        steamId: game.appid.toString(),
        title: game.name,
        image: game.header_image,
        genres: game.genres?.map(g => g.description) || [],
        releaseDate: game.release_date?.date ? new Date(game.release_date.date).getFullYear().toString() : 'Unknown',
        steamRating: game.metacritic?.score || null,
        developers: game.developers || [],
        publishers: game.publishers || [],
        price: convertedPrice,
        categories: game.categories?.map(c => c.description) || [],
        platforms: game.platforms || { windows: false, mac: false, linux: false },
        description: game.short_description,
        isFree: !game.price_overview || game.price_overview.final === 0
      };
    });
    
    return NextResponse.json({ 
      games: formattedGames,
      total: formattedGames.length,
      query: query
    })
  } catch (error) {
    console.error('Steam API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch games from Steam API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}