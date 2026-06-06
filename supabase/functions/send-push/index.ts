import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LegacyPushRequest {
  subscription: {
    endpoint: string
    fcm_token?: string
  }
  title: string
  body: string
  data?: any
}

// このFunction は後方互換性のために残しているが、
// 新しい実装では send-notification を使用することを推奨
serve(async (req) => {
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

  console.warn('send-push function is deprecated. Please use send-notification instead.')

  try {
    const { subscription, title, body, data } = await req.json() as LegacyPushRequest

    // iOSローカル通知の場合はスキップ
    if (subscription.endpoint === 'local-notifications-only') {
      console.log('iOS local notification - cannot send server push')
      return new Response(
        JSON.stringify({ success: true, message: 'iOS local notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    
    // FCMトークンがある場合はFCMを使用
    if (subscription.fcm_token && fcmServerKey) {
      console.log('Sending FCM notification via legacy endpoint')
      
      const fcmEndpoint = 'https://fcm.googleapis.com/fcm/send'
      const response = await fetch(fcmEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: subscription.fcm_token,
          notification: {
            title,
            body,
            icon: '/icon-192x192.png',
            click_action: data?.url || '/',
          },
          data: data || {},
          webpush: {
            fcm_options: {
              link: data?.url || '/'
            }
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`FCM request failed: ${response.status}`)
      }

      const result = await response.json()
      
      return new Response(
        JSON.stringify({ success: true, fcmResult: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // FCMが利用できない場合のフォールバック
    console.log('FCM not available, using fallback response')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification processed (legacy endpoint)',
        details: { title, body },
        warning: 'This endpoint is deprecated. Please migrate to send-notification.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-push (legacy):', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        warning: 'This endpoint is deprecated. Please migrate to send-notification.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})