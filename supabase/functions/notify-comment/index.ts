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

  // Internal function: only the service role (DB trigger) may invoke this.
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (SERVICE_KEY && req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
    )
  }

  try {
    const { record } = await req.json()
    
    // Supabaseクライアントを初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Processing comment notification for comment:', record.id)

    // コメントの詳細情報を取得（ユーザー情報含む）
    const { data: commentData, error: commentError } = await supabase
      .from('diary_comments')
      .select(`
        *,
        commenter:user_id(name),
        diary_entry:diary_entry_id(
          id,
          title,
          user_id,
          author:user_id(name)
        )
      `)
      .eq('id', record.id)
      .single()

    if (commentError || !commentData) {
      console.error('Failed to fetch comment data:', commentError)
      return new Response(
        JSON.stringify({ error: 'Comment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const diaryEntry = commentData.diary_entry
    const commenterName = commentData.commenter?.name || 'Unknown User'
    const diaryAuthorId = diaryEntry.user_id
    const diaryTitle = diaryEntry.title || '無題の日記'

    // 日記の作者がコメントした場合は通知しない
    if (commentData.user_id === diaryAuthorId) {
      console.log('Author commented on own diary, skipping notification')
      return new Response(
        JSON.stringify({ message: 'Author self-comment, no notification needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 日記の作者に通知を送信
    console.log(`Sending comment notification to diary author: ${diaryAuthorId}`)

    const notificationTitle = '新しいコメント'
    const notificationBody = `${commenterName}さんが「${diaryTitle}」にコメントしました`
    
    try {
      const { error: notifyError } = await supabase.functions.invoke('send-notification', {
        body: {
          userId: diaryAuthorId,
          title: notificationTitle,
          body: notificationBody,
          type: 'comment',
          data: {
            url: `/diary/${diaryEntry.id}#comment-${record.id}`,
            diaryId: diaryEntry.id,
            commentId: record.id,
            commenterName: commenterName
          }
        }
      })

      if (notifyError) {
        console.error(`Failed to notify diary author ${diaryAuthorId}:`, notifyError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to send notification',
            details: notifyError
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      console.log(`Successfully notified diary author ${diaryAuthorId}`)

      // 親コメントがある場合、親コメントの作者にも通知
      let parentNotified = false
      if (commentData.parent_comment_id) {
        const { data: parentComment } = await supabase
          .from('diary_comments')
          .select('user_id, commenter:user_id(name)')
          .eq('id', commentData.parent_comment_id)
          .single()

        if (parentComment && 
            parentComment.user_id !== commentData.user_id && 
            parentComment.user_id !== diaryAuthorId) {
          
          const parentCommenterName = parentComment.commenter?.name || 'Unknown User'
          const replyTitle = 'コメントに返信'
          const replyBody = `${commenterName}さんがあなたのコメントに返信しました`
          
          const { error: replyNotifyError } = await supabase.functions.invoke('send-notification', {
            body: {
              userId: parentComment.user_id,
              title: replyTitle,
              body: replyBody,
              type: 'comment',
              data: {
                url: `/diary/${diaryEntry.id}#comment-${record.id}`,
                diaryId: diaryEntry.id,
                commentId: record.id,
                parentCommentId: commentData.parent_comment_id,
                commenterName: commenterName
              }
            }
          })

          if (!replyNotifyError) {
            parentNotified = true
            console.log(`Successfully notified parent commenter ${parentComment.user_id}`)
          } else {
            console.error(`Failed to notify parent commenter:`, replyNotifyError)
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          notifiedAuthor: true,
          notifiedParentCommenter: parentNotified,
          commentId: record.id,
          diaryId: diaryEntry.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Notification service error',
          details: notificationError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in notify-comment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})