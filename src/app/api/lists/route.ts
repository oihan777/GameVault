import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const lists = await db.customList.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(lists)
  } catch (error) {
    console.error('Failed to fetch lists:', error)
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color } = body
    
    const list = await db.customList.create({
      data: {
        name,
        color
      }
    })
    
    return NextResponse.json(list)
  } catch (error) {
    console.error('Failed to create list:', error)
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }
}