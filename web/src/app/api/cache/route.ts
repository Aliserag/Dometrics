import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Initialize Upstash Redis client (optional - only if you have Upstash configured)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Key parameter is required' }, { status: 400 })
    }

    if (!redis) {
      // Return null if Redis is not configured (development mode)
      return NextResponse.json({ data: null, cached: false })
    }

    const cachedData = await redis.get(key)
    
    return NextResponse.json({
      data: cachedData,
      cached: !!cachedData,
      ttl: cachedData ? await redis.ttl(key) : 0
    })
  } catch (error) {
    console.error('Cache GET error:', error)
    return NextResponse.json({ error: 'Failed to retrieve from cache' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, data, ttl = 300 } = body // Default TTL: 5 minutes

    if (!key || !data) {
      return NextResponse.json({ error: 'Key and data are required' }, { status: 400 })
    }

    if (!redis) {
      // Return success even if Redis is not configured (development mode)
      return NextResponse.json({ success: true, cached: false })
    }

    await redis.set(key, data, { ex: ttl })
    
    return NextResponse.json({
      success: true,
      cached: true,
      ttl
    })
  } catch (error) {
    console.error('Cache POST error:', error)
    return NextResponse.json({ error: 'Failed to save to cache' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Key parameter is required' }, { status: 400 })
    }

    if (!redis) {
      return NextResponse.json({ success: true, cached: false })
    }

    await redis.del(key)
    
    return NextResponse.json({
      success: true,
      cached: true
    })
  } catch (error) {
    console.error('Cache DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete from cache' }, { status: 500 })
  }
}