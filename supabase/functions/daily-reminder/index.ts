import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderRequest {
  userId?: string // 特定のユーザーに送信する場合
  testMode?: boolean // テスト用
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Internal function: only the service role (cron / trigger) may invoke this.
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (SERVICE_KEY && req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
    )
  }

  try {
    const body = await req.json() as ReminderRequest || {}
    const { userId, testMode } = body
    
    // Supabaseクライアントを初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const currentTime = new Date()
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`
    
    console.log(`Daily reminder check at ${currentTimeString}`)

    let usersToNotify = []

    if (userId) {
      // 特定のユーザーを対象にする場合
      console.log(`Sending reminder to specific user: ${userId}`)
      const { data: user } = await supabase
        .from('notification_settings')
        .select('user_id, daily_reminder, reminder_time, user:user_id(name)')
        .eq('user_id', userId)
        .eq('daily_reminder', true)
        .single()

      if (user) {
        usersToNotify = [user]
      }
    } else {
      // 現在時刻でリマインダーを設定している全ユーザーを取得
      let timeQuery = supabase
        .from('notification_settings')
        .select('user_id, daily_reminder, reminder_time, user:user_id(name)')
        .eq('daily_reminder', true)

      if (!testMode) {
        // 本番モードでは現在時刻にマッチするユーザーのみ
        // 分単位での比較（秒は無視）
        const timeRange = []
        for (let i = 0; i <= 2; i++) { // 2分の幅を持たせる
          const checkMinute = (currentMinute + i) % 60
          const checkHour = currentMinute + i >= 60 ? (currentHour + 1) % 24 : currentHour
          const checkTimeString = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}:00`
          timeRange.push(checkTimeString)
        }
        
        timeQuery = timeQuery.in('reminder_time', timeRange)
      }

      const { data: users, error } = await timeQuery

      if (error) {
        console.error('Error fetching users for reminder:', error)
        throw error
      }

      usersToNotify = users || []
    }

    console.log(`Found ${usersToNotify.length} users to notify`)

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users to notify at this time',
          currentTime: currentTimeString
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []
    
    for (const userSettings of usersToNotify) {
      try {
        const userName = userSettings.user?.name || 'あなた'
        
        // 今日の日記が既に投稿されているかチェック
        const today = new Date().toISOString().split('T')[0]
        const { data: todayEntries } = await supabase
          .from('diary_entries')
          .select('id')
          .eq('user_id', userSettings.user_id)
          .gte('created_at', `${today}T00:00:00Z`)
          .lt('created_at', `${today}T23:59:59Z`)

        let notificationTitle = '日記を書く時間です'
        let notificationBody = '今日の出来事を日記に残しましょう'

        // 既に今日の日記がある場合はメッセージを変更
        if (todayEntries && todayEntries.length > 0) {
          notificationTitle = '日記の追記はいかがですか？'
          notificationBody = '今日は既に日記を書かれていますが、追加で何か書きたいことはありませんか？'
        }

        const { error: notifyError } = await supabase.functions.invoke('send-notification', {
          body: {
            userId: userSettings.user_id,
            title: notificationTitle,
            body: notificationBody,
            type: 'reminder',
            data: {
              url: '/record',
              reminderType: 'daily',
              hasEntryToday: (todayEntries && todayEntries.length > 0)
            }
          }
        })

        const result = {
          userId: userSettings.user_id,
          userName: userName,
          reminderTime: userSettings.reminder_time,
          success: !notifyError,
          hasEntryToday: (todayEntries && todayEntries.length > 0),
          error: notifyError ? notifyError.message : null
        }

        results.push(result)

        if (notifyError) {
          console.error(`Failed to send reminder to ${userSettings.user_id}:`, notifyError)
        } else {
          console.log(`Successfully sent reminder to ${userSettings.user_id} (${userName})`)
        }

      } catch (userError) {
        console.error(`Error processing user ${userSettings.user_id}:`, userError)
        results.push({
          userId: userSettings.user_id,
          success: false,
          error: userError.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return new Response(
      JSON.stringify({ 
        success: true,
        currentTime: currentTimeString,
        totalUsers: results.length,
        successCount,
        failureCount,
        testMode: testMode || false,
        results: testMode ? results : results.map(r => ({ 
          userId: r.userId, 
          success: r.success, 
          hasEntryToday: r.hasEntryToday 
        })) // 本番では詳細情報を制限
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in daily-reminder:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})