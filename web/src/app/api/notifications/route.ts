import { NextRequest, NextResponse } from 'next/server'

interface NotificationRule {
  id: string
  userId: string
  type: 'expiry' | 'price' | 'momentum' | 'risk'
  condition: {
    operator: 'gt' | 'lt' | 'eq'
    value: number
    domainId?: string
  }
  enabled: boolean
  createdAt: string
}

// Mock notification rules - replace with actual database
const mockRules: NotificationRule[] = [
  {
    id: '1',
    userId: 'user1',
    type: 'expiry',
    condition: { operator: 'lt', value: 30 }, // Alert when < 30 days to expiry
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'user1',
    type: 'momentum',
    condition: { operator: 'gt', value: 80 }, // Alert when momentum > 80
    enabled: true,
    createdAt: new Date().toISOString(),
  },
]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Filter rules by user
    const userRules = mockRules.filter(rule => rule.userId === userId)

    return NextResponse.json({
      rules: userRules,
      total: userRules.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching notification rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification rules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, condition, enabled = true } = body

    if (!userId || !type || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const newRule: NotificationRule = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      type,
      condition,
      enabled,
      createdAt: new Date().toISOString(),
    }

    // In production, save to database
    mockRules.push(newRule)

    return NextResponse.json({
      rule: newRule,
      message: 'Notification rule created successfully',
    })
  } catch (error) {
    console.error('Error creating notification rule:', error)
    return NextResponse.json(
      { error: 'Failed to create notification rule' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ruleId = searchParams.get('ruleId')

    if (!ruleId) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    // In production, delete from database
    const index = mockRules.findIndex(rule => rule.id === ruleId)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    mockRules.splice(index, 1)

    return NextResponse.json({
      message: 'Notification rule deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting notification rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification rule' },
      { status: 500 }
    )
  }
}