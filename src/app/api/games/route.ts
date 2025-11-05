import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const games = await db.game.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    const formattedGames = games.map(game => ({
      ...game,
      genres: JSON.parse(game.genres),
      developers: JSON.parse(game.developers || '[]'),
      publishers: JSON.parse(game.publishers || '[]'),
      price: game.price ? JSON.parse(game.price) : null,
      categories: JSON.parse(game.categories || '[]'),
      platforms: JSON.parse(game.platforms || '{}')
    }))
    
    return NextResponse.json(formattedGames)
  } catch (error) {
    console.error('Failed to fetch games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      steamId, 
      title, 
      image, 
      genres, 
      releaseDate, 
      steamRating,
      developers,
      publishers,
      price,
      categories,
      platforms,
      description,
      isFree
    } = body
    
    // Check if game already exists
    const existingGame = await db.game.findUnique({
      where: { steamId }
    })
    
    if (existingGame) {
      return NextResponse.json({ error: 'Game already in library' }, { status: 409 })
    }
    
    const game = await db.game.create({
      data: {
        steamId,
        title,
        image,
        genres: JSON.stringify(genres || []),
        releaseDate,
        steamRating,
        userRating: 0,
        status: 'Pending',
        list: 'None',
        isFavorite: false,
        developers: JSON.stringify(developers || []),
        publishers: JSON.stringify(publishers || []),
        price: price ? JSON.stringify(price) : null,
        categories: JSON.stringify(categories || []),
        platforms: JSON.stringify(platforms || {}),
        description: description || '',
        isFree: isFree || false
      }
    })
    
    return NextResponse.json({
      ...game,
      genres: JSON.parse(game.genres),
      developers: JSON.parse(game.developers || '[]'),
      publishers: JSON.parse(game.publishers || '[]'),
      price: game.price ? JSON.parse(game.price) : null,
      categories: JSON.parse(game.categories || '[]'),
      platforms: JSON.parse(game.platforms || '{}')
    })
  } catch (error) {
    console.error('Failed to add game:', error)
    return NextResponse.json({ error: 'Failed to add game' }, { status: 500 })
  }
}