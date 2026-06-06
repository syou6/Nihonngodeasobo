import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  userId: string
  title: string
  body: string
  data?: any
  type?: 'diary' | 'comment' | 'reminder'
}

// Web Push VAPID keys come from env only. A hardcoded private-key fallback is a
// leaked secret — set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY as Edge Function secrets.
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''

// FCM Configuration
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

// Helper function to send FCM notification
async function sendFCMNotification(fcmToken: string, title: string, body: string, data: any = {}) {
  if (!FCM_SERVER_KEY) {
    console.log('FCM_SERVER_KEY not configured, skipping FCM')
    return null
  }

  const fcmEndpoint = 'https://fcm.googleapis.com/fcm/send'
  const response = await fetch(fcmEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: {
        title,
        body,
        icon: '/icon-192x192.png',
        click_action: data.url || '/',
      },
      data: data,
      webpush: {
        fcm_options: {
          link: data.url || '/'
        }
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`FCM request failed: ${response.status}`)
  }

  return await response.json()
}

// Helper function to send Web Push notification
async function sendWebPushNotification(subscription: any, title: string, body: string, data: any = {}) {
  if (subscription.endpoint === 'local-notifications-only') {
    console.log('iOS local notification - cannot send server push')
    return { success: true, message: 'iOS local notification' }
  }

  // For Web Push, we would need to implement VAPID authentication
  // For now, we'll use FCM token if available
  if (subscription.fcm_token) {
    return await sendFCMNotification(subscription.fcm_token, title, body, data)
  }

  console.log('Web Push endpoint found but no FCM token, skipping')
  return { success: true, message: 'No FCM token available' }
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Internal function: only the service role (DB triggers / cron) may invoke this.
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (SERVICE_KEY && req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
    )
  }

  try {
    const { userId, title, body, data, type } = await req.json() as NotificationPayload

    // Supabaseクライアントを初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Sending ${type || 'generic'} notification to user ${userId}: ${title}`)

    // ユーザーの通知設定をチェック
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!settings) {
      console.log(`No notification settings found for user ${userId}`)
      return new Response(
        JSON.stringify({ error: 'No notification settings found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // 通知タイプに応じて設定をチェック
    let shouldSend = true
    switch (type) {
      case 'diary':
        shouldSend = settings.family_diary
        break
      case 'comment':
        shouldSend = settings.new_comment
        break
      case 'reminder':
        shouldSend = settings.daily_reminder
        break
      default:
        shouldSend = true // デフォルトは送信
    }

    if (!shouldSend) {
      console.log(`User ${userId} has disabled ${type} notifications`)
      return new Response(
        JSON.stringify({ success: true, message: 'Notification disabled by user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ユーザーのプッシュサブスクリプションを取得
    const { data: subscription, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      console.log('No subscription found for user:', userId)
      return new Response(
        JSON.stringify({ error: 'No subscription found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // 通知データの準備
    const notificationData = {
      ...data,
      url: data?.url || '/',
      type: type || 'generic',
      timestamp: new Date().toISOString()
    }

    let result
    try {
      result = await sendWebPushNotification(subscription, title, body, notificationData)
      console.log('Notification sent successfully:', result)
    } catch (pushError) {
      console.error('Failed to send push notification:', pushError)
      // プッシュ通知に失敗してもエラーにしない（ログのみ）
      result = { success: false, error: pushError.message }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        notificationType: type,
        settingsChecked: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})