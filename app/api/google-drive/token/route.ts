import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri, clientId } = await request.json()

    if (!code || !redirectUri || !clientId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile',
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Google Drive token request failed:', errorData)
      return NextResponse.json(
        { error: `Failed to get tokens: ${response.statusText} - ${errorData.error_description || errorData.error || ''}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    })
  } catch (error) {
    console.error('Google Drive token exchange error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 