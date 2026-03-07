import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    
    // Supabaseクライアントを初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 投稿者の情報を取得
    const { data: author } = await supabase
      .from('users')
      .select('name')
      .eq('id', record.user_id)
      .single()

    if (!author) {
      return new Response(
        JSON.stringify({ error: 'Author not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // 家族関係を取得
    const { data: relationships } = await supabase
      .from('family_relationships')
      .select('teacher_id, learner_id')
      .or(`teacher_id.eq.${record.user_id},learner_id.eq.${record.user_id}`)

    if (!relationships || relationships.length === 0) {
      console.log('No family relationships found')
      return new Response(
        JSON.stringify({ message: 'No family to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 通知対象のユーザーIDを収集
    const familyUserIds = new Set<string>()
    relationships.forEach(rel => {
      if (rel.teacher_id !== record.user_id) familyUserIds.add(rel.teacher_id)
      if (rel.learner_id !== record.user_id) familyUserIds.add(rel.learner_id)
    })

    console.log(`Found ${familyUserIds.size} family members to potentially notify`)

    // 通知結果を追跡
    const notificationResults = []

    // 並行して通知を送信（パフォーマンス向上）
    const notificationPromises = Array.from(familyUserIds).map(async (userId) => {
      try {
        const notificationTitle = '新しい日記が投稿されました'
        const notificationBody = `${author.name}さんが日記を投稿しました`
        
        const { data, error: notifyError } = await supabase.functions.invoke('send-notification', {
          body: {
            userId: userId,
            title: notificationTitle,
            body: notificationBody,
            type: 'diary',
            data: {
              url: '/diary',
              diaryId: record.id,
              authorName: author.name
            }
          }
        })

        const result = {
          userId,
          success: !notifyError,
          error: notifyError ? notifyError.message : null,
          response: data
        }

        if (notifyError) {
          console.error(`Failed to notify user ${userId}:`, notifyError)
        } else {
          console.log(`Successfully notified user ${userId}`)
        }

        return result
      } catch (error) {
        console.error(`Error processing notification for user ${userId}:`, error)
        return {
          userId,
          success: false,
          error: error.message
        }
      }
    })

    // 全ての通知処理を待機
    const results = await Promise.allSettled(notificationPromises)
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        notificationResults.push(result.value)
      } else {
        console.error(`Notification promise rejected for user:`, result.reason)
        notificationResults.push({
          userId: Array.from(familyUserIds)[index],
          success: false,
          error: result.reason?.message || 'Promise rejected'
        })
      }
    })

    const successCount = notificationResults.filter(r => r.success).length
    const failureCount = notificationResults.length - successCount

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalFamilyMembers: familyUserIds.size,
        notificationsSent: successCount,
        notificationsFailed: failureCount,
        diaryId: record.id,
        authorName: author.name,
        results: notificationResults.map(r => ({
          userId: r.userId,
          success: r.success,
          error: r.error
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in notify-new-diary:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})