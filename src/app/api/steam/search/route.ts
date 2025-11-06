import { NextResponse } from "next/server";

const STEAM_SEARCH_URL = "https://store.steampowered.com/api/storesearch";
const STEAM_DETAILS_URL = "https://store.steampowered.com/api/appdetails";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "Invalid search query" }, { status: 400 });
  }

  try {
    // 1️⃣ Buscar coincidencias en Steam
    const searchUrl = `${STEAM_SEARCH_URL}/?term=${encodeURIComponent(
      query
    )}&l=spanish&cc=es`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData || !Array.isArray(searchData.items)) {
      throw new Error("Unexpected API format");
    }

    // 2️⃣ Limitar y obtener detalles de cada app
    const topResults = searchData.items.slice(0, 15);
    const detailPromises = topResults.map(async (item) => {
      try {
        const detailsUrl = `${STEAM_DETAILS_URL}?appids=${item.id}&l=spanish&cc=es`;
        const res = await fetch(detailsUrl);
        const data = await res.json();

        const appData = data[item.id]?.data;
        if (!appData) return null;

        return {
          steamId: item.id,
          title: appData.name || item.name,
          description: appData.short_description || "",
          image:
            appData.header_image ||
            (item.tiny_image ? item.tiny_image : "/no-image.png"),
          releaseDate: appData.release_date?.date || "Unknown",
          genres: appData.genres?.map((g: any) => g.description) || [],
          developers: appData.developers || [],
          publishers: appData.publishers || [],
          price:
            appData.is_free === true
              ? "Free"
              : appData.price_overview
              ? appData.price_overview.final_formatted
              : "Unknown",
          categories:
            appData.categories?.map((c: any) => c.description) || [],
          platforms: Object.keys(appData.platforms || {}).filter(
            (p) => appData.platforms[p]
          ),
          steamRating: appData.metacritic?.score || null,
          isFree: appData.is_free || false,
        };
      } catch (err) {
        console.warn("Error fetching details for", item.id, err);
        return null;
      }
    });

    // 3️⃣ Esperar todas las peticiones sin romper si alguna falla
    const results = await Promise.allSettled(detailPromises);
    const validGames = results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r: any) => r.value);

    // 4️⃣ Eliminar duplicados por Steam ID
    const uniqueGames = Array.from(
      new Map(validGames.map((g) => [g.steamId, g])).values()
    );

    return NextResponse.json({ results: uniqueGames });
  } catch (error) {
    console.error("Steam API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from Steam API" },
      { status: 500 }
    );
  }
}
