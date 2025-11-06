import { NextRequest, NextResponse } from 'next/server'

interface SteamGame {
  appid: number
  name: string
  header_image: string
  genres?: Array<{ id: number; description: string }>
  release_date?: { date: string; coming_soon: boolean }
  metacritic?: { score: number; url: string }
  developers?: Array<string>
  publishers?: Array<string>
  price_overview?: {
    currency: string
    initial: number
    final: number
    discount_percent: number
  }
  categories?: Array<{ id: number; description: string }>
  platforms?: { windows: boolean; mac: boolean; linux: boolean }
  short_description: string
}

interface SteamSearchResponse {
  apps: Array<{ appid: number; name: string }>
}

interface SteamAppDetailsResponse {
  [appid: string]: { data: SteamGame; success: boolean }
}

// --- Conversión de monedas ---
const convertToEUR = (price: number, currency: string): number => {
  const rates: Record<string, number> = {
    USD: 0.92, GBP: 1.17, EUR: 1.0, RUB: 0.01, BRL: 0.18, JPY: 0.0062,
    KRW: 0.00068, TRY: 0.028, CNY: 0.13, TWD: 0.029, SGD: 0.68, HKD: 0.12,
    CAD: 0.68, AUD: 0.62, NZD: 0.57, MXN: 0.054, ARS: 0.0011, CLP: 0.0011,
    PEN: 0.26, COP: 0.00023, UYU: 0.024, NOK: 0.087, DKK: 0.13, SEK: 0.087,
    PLN: 0.23, CHF: 1.03, CZK: 0.039, HUF: 0.0026, RON: 0.2, HRK: 0.13,
    BGN: 0.51, RSD: 0.0085, MYR: 0.2, THB: 0.026, IDR: 0.000059, VND: 0.000038,
    UAH: 0.025, KZT: 0.002, INR: 0.011, PKR: 0.0033, LKR: 0.0029, BDT: 0.0085,
    NPR: 0.0069, MMK: 0.00044, KHR: 0.00022, LAK: 0.000051, MVR: 0.059,
    PHP: 0.016, MOP: 0.11, TMT: 0.26, GEL: 0.34, AMD: 0.0019, AZN: 0.54,
    KGS: 0.01, UZS: 0.000075, TJS: 0.089, AFN: 0.01, IRR: 0.000022, IQD: 0.0007,
    JOD: 1.3, SAR: 0.25, YER: 0.0037, OMR: 2.39, BHD: 2.45, QAR: 0.25,
    AED: 0.25, KWD: 3.04, LBP: 0.000061, SYP: 0.0000074, ILS: 0.25,
    EGP: 0.019, DZD: 0.0069, TND: 0.3, MAD: 0.093, LYD: 0.2, GHS: 0.076,
    NGN: 0.00061, XOF: 0.0015, XAF: 0.0015, XPF: 0.0084, VUV: 0.0075,
    WST: 0.34, SBD: 0.11, FJD: 0.41, TOP: 0.39, PGK: 0.26, SCR: 0.067,
    MUR: 0.02, KES: 0.0073, TZS: 0.00038, UGX: 0.00025, RWF: 0.00085,
    BIF: 0.00034, DJF: 0.0052, ERN: 0.000061, ETB: 0.016, SOS: 0.0016,
    ZAR: 0.05, BWP: 0.069, LSL: 0.05, SZL: 0.05, NAD: 0.05, AOA: 0.0016,
    XCD: 0.34, BBD: 0.46, BSD: 0.92, BZD: 0.46, GTQ: 0.12, HNL: 0.037,
    NIO: 0.025, CRC: 0.0016, PAB: 0.92, VEF: 0.000000091, GYD: 0.0044,
    SRD: 0.025, TVD: 0.62
  }
  return price * (rates[currency] ?? 0.92)
}

const formatEUR = (price: number): string => `€${price.toFixed(2)}`

// --- Búsqueda principal ---
async function searchSteamStore(query: string): Promise<SteamGame[]> {
  try {
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`
    const searchResponse = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!searchResponse.ok) throw new Error('Steam search API failed')

    const searchData: SteamSearchResponse = await searchResponse.json()
    const appIds = (searchData.apps ?? []).slice(0, 10).map(app => app.appid)
    if (appIds.length === 0) throw new Error('No se encontraron juegos')

    const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appIds.join(',')}&l=english`
    const detailsResponse = await fetch(detailsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!detailsResponse.ok) throw new Error('Steam details API failed')

    const detailsData: SteamAppDetailsResponse = await detailsResponse.json()

    return appIds
      .map(id => {
        const details = detailsData[id]
        if (!details?.success || details.data?.type !== 'game') return null
        const d = details.data
        return {
          appid: id,
          name: d.name,
          header_image: d.header_image,
          genres: d.genres || [],
          release_date: d.release_date,
          metacritic: d.metacritic,
          developers: d.developers || [],
          publishers: d.publishers || [],
          price_overview: d.price_overview,
          categories: d.categories || [],
          platforms: d.platforms || { windows: false, mac: false, linux: false },
          short_description: d.short_description
        }
      })
      .filter(Boolean) as SteamGame[]
  } catch (e) {
    console.error('Steam Store API error:', e)
    return []
  }
}

// --- Búsqueda alternativa ---
async function searchSteamAlternative(query: string): Promise<SteamGame[]> {
  try {
    const searchUrl = `https://store.steampowered.com/search/results/?term=${encodeURIComponent(query)}&category1=998&supportedlang=english&ndl=1`
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    })

    if (!response.ok) throw new Error('Alternative search failed')

    const html = await response.text()
    const matches = [...html.matchAll(/data-ds-appid="(\d+)"/g)]
    const appIds = [...new Set(matches.map(m => m[1]))].slice(0, 5)

    const games = await Promise.all(
      appIds.map(async id => {
        try {
          const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&l=english`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          })
          if (!res.ok) return null
          const json: SteamAppDetailsResponse = await res.json()
          const details = json[id]
          if (!details?.success || details.data?.type !== 'game') return null
          const d = details.data
          return {
            appid: parseInt(id),
            name: d.name,
            header_image: d.header_image,
            genres: d.genres || [],
            release_date: d.release_date,
            metacritic: d.metacritic,
            developers: d.developers || [],
            publishers: d.publishers || [],
            price_overview: d.price_overview,
            categories: d.categories || [],
            platforms: d.platforms || { windows: false, mac: false, linux: false },
            short_description: d.short_description
          }
        } catch (err) {
          console.error(`Error fetching details for app ${id}:`, err)
          return null
        }
      })
    )

    return games.filter(Boolean) as SteamGame[]
  } catch (e) {
    console.error('Alternative API error:', e)
    return []
  }
}

// --- Handler principal ---
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query parameter must be at least 2 characters' }, { status: 400 })
  }

  try {
    let games = await searchSteamStore(query)
    if (games.length === 0) {
      console.log('Trying alternative search method...')
      games = await searchSteamAlternative(query)
    }

    const formattedGames = games.map(g => {
      let price = null
      if (g.price_overview) {
        const finalEUR = convertToEUR(g.price_overview.final / 100, g.price_overview.currency)
        const initialEUR = convertToEUR(g.price_overview.initial / 100, g.price_overview.currency)
        price = {
          final: finalEUR,
          initial: initialEUR,
          discountPercent: g.price_overview.discount_percent,
          currency: 'EUR',
          formattedFinal: formatEUR(finalEUR),
          formattedInitial: formatEUR(initialEUR)
        }
      }

      return {
        steamId: g.appid.toString(),
        title: g.name,
        image: g.header_image,
        genres: g.genres?.map(x => x.description) || [],
        releaseDate: g.release_date?.date
          ? new Date(g.release_date.date).getFullYear().toString()
          : 'Unknown',
        steamRating: g.metacritic?.score || null,
        developers: g.developers || [],
        publishers: g.publishers || [],
        price,
        categories: g.categories?.map(c => c.description) || [],
        platforms: g.platforms || { windows: false, mac: false, linux: false },
        description: g.short_description,
        isFree: !g.price_overview || g.price_overview.final === 0
      }
    })

    return NextResponse.json({ games: formattedGames, total: formattedGames.length, query })
  } catch (error) {
    console.error('Steam API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games from Steam API', details: (error as Error).message },
      { status: 500 }
    )
  }
}
