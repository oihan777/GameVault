import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, userRating, list, isFavorite } = body
    
    const game = await db.game.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(userRating !== undefined && { userRating }),
        ...(list !== undefined && { list }),
        ...(isFavorite !== undefined && { isFavorite })
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
    console.error('Failed to update game:', error)
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.game.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete game:', error)
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
  }
}