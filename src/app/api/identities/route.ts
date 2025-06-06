import { socialfi } from '@/utils/socialfi'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('walletAddress')

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 },
    )
  }

  if (!process.env.TAPESTRY_API_KEY) {
    console.error('TAPESTRY_API_KEY is not configured')
    return NextResponse.json(
      { error: 'API configuration error' },
      { status: 500 },
    )
  }

  try {
    const response = await socialfi.identities.identitiesDetail({
      id: walletAddress,
      apiKey: process.env.TAPESTRY_API_KEY,
    })

    console.log('Identities API response:', response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profiles' },
      { status: 500 },
    )
  }
}
