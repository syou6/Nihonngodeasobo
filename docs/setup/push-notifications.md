# Push Notifications Setup Guide - AI-Voce-Journal

## Overview

This document explains how to set up and configure the push notification system for the AI-Voce-Journal project. The system supports:

- **Family diary notifications** - When family members post new diary entries
- **Comment notifications** - When someone comments on a diary entry
- **Daily reminders** - Scheduled reminders to write diary entries
- **iOS PWA support** - Works with iPhone when installed as a PWA
- **Firebase Cloud Messaging (FCM)** - For reliable push notifications
- **Web Push API** - Fallback for browsers without FCM

## Database Schema

The system uses the following database tables (already created in migrations):

### 1. `push_subscriptions`
Stores user push notification subscriptions.
```sql
- id: UUID (primary key)
- user_id: UUID (references users.id)
- endpoint: TEXT (push subscription endpoint)
- p256dh: TEXT (encryption key)
- auth: TEXT (authentication key)
- fcm_token: TEXT (Firebase Cloud Messaging token)
```

### 2. `notification_settings`
Stores user notification preferences.
```sql
- user_id: UUID (references users.id)
- new_comment: BOOLEAN (default: true)
- family_diary: BOOLEAN (default: true)
- daily_reminder: BOOLEAN (default: false)
- reminder_time: TIME (default: '20:00:00')
```

### 3. `family_relationships`
Manages family connections for notification targeting.
```sql
- parent_id: UUID (references users.id)
- child_id: UUID (references users.id)
- relationship_type: TEXT (default: 'parent-child')
- status: TEXT (default: 'active')
```

### 4. `diary_entries` & `diary_comments`
Core diary functionality with notification triggers.

## Edge Functions

### 1. `send-notification`
**Purpose**: Main notification function that handles user preferences and multiple delivery methods.

**Endpoint**: `/functions/v1/send-notification`

**Parameters**:
```json
{
  "userId": "string (required)",
  "title": "string (required)", 
  "body": "string (required)",
  "type": "diary|comment|reminder (optional)",
  "data": {
    "url": "string (optional)",
    "diaryId": "string (optional)",
    "commentId": "string (optional)"
  }
}
```

**Features**:
- Checks user notification settings before sending
- Supports FCM and Web Push delivery
- Handles iOS local notification scenarios
- Comprehensive error handling and logging

### 2. `notify-new-diary`
**Purpose**: Automatically notify family members when a new diary entry is posted.

**Triggered by**: Database trigger on `diary_entries` table INSERT
**Handles**: Family relationship lookup and parallel notification sending

### 3. `notify-comment` 
**Purpose**: Notify diary authors and parent comment authors about new comments.

**Triggered by**: Database trigger on `diary_comments` table INSERT
**Features**: 
- Notifies diary author
- Notifies parent comment author for replies
- Prevents self-notification

### 4. `daily-reminder`
**Purpose**: Send scheduled daily reminders to write diary entries.

**Usage**: Call via cron job or scheduled task
**Parameters**:
```json
{
  "userId": "string (optional - for specific user)",
  "testMode": "boolean (optional - for testing)"
}
```

## Configuration

### 1. Environment Variables

#### Client-side (.env)
```bash
# Already configured in your .env file:
VITE_VAPID_PUBLIC_KEY=BPbbeE9gPuQBaFzqzQ6sODqkCH4gODBWF2yNnCXQIr_ym1dvle_Gl_U2_QcdK-sG7KTRqCf9sKQZJw_F4B_bZwI
VITE_VAPID_PRIVATE_KEY=BvVLEzrNTqZmsodEnfjIHHGLTRuVQmwzx-cEJIGrpWw

# Firebase configuration (already set):
VITE_FIREBASE_PROJECT_ID=ai-voce-40094
VITE_FIREBASE_API_KEY=AIzaSyBDB0gVI82wwhp7Khd5T5jgxyqGD96XPJM
# ... other Firebase settings
```

#### Edge Functions (supabase/.env.local)
```bash
# VAPID Keys (already configured)
VAPID_PUBLIC_KEY=BPbbeE9gPuQBaFzqzQ6sODqkCH4gODBWF2yNnCXQIr_ym1dvle_Gl_U2_QcdK-sG7KTRqCf9sKQZJw_F4B_bZwI
VAPID_PRIVATE_KEY=BvVLEzrNTqZmsodEnfjIHHGLTRuVQmwzx-cEJIGrpWw

# FCM Server Key (TO BE ADDED)
# Get this from Firebase Console > Project Settings > Cloud Messaging
FCM_SERVER_KEY=your_fcm_server_key_here
```

### 2. Firebase Setup

#### Get FCM Server Key:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ai-voce-40094`
3. Go to Project Settings > Cloud Messaging
4. Copy the "Server key" 
5. Add it to `supabase/.env.local` as `FCM_SERVER_KEY`

#### Web Push Certificates:
1. In Firebase Console > Project Settings > Cloud Messaging
2. Go to "Web configuration" section
3. Generate Web Push certificates if not already done
4. The VAPID key should match the one in your .env files

### 3. Database Triggers Setup

The notification system uses database triggers to automatically send notifications. Due to Supabase limitations with `pg_net`, you have two options:

#### Option A: Manual Webhooks (Recommended)
1. Go to Supabase Dashboard > Database > Webhooks
2. Create webhooks for:
   - Table: `diary_entries`, Event: `INSERT`
   - URL: `https://dtcskayvcsrgjausqkni.supabase.co/functions/v1/notify-new-diary`
   - Table: `diary_comments`, Event: `INSERT` 
   - URL: `https://dtcskayvcsrgjausqkni.supabase.co/functions/v1/notify-comment`

#### Option B: Enable pg_net Extension (If Available)
1. Go to Supabase Dashboard > Database > Extensions
2. Enable the `pg_net` extension
3. The database triggers will work automatically

## Testing

### 1. Test Push Notifications
Use the test button in the notification settings page:
- Go to Settings > Notifications
- Click "テスト通知を送信" (Send Test Notification)
- Check browser/device for notification

### 2. Test Daily Reminders
Call the Edge Function directly:
```bash
curl -X POST 'https://dtcskayvcsrgjausqkni.supabase.co/functions/v1/daily-reminder' \
-H 'Authorization: Bearer YOUR_ANON_KEY' \
-H 'Content-Type: application/json' \
-d '{"testMode": true, "userId": "user_id_here"}'
```

### 3. Test Family Notifications
1. Create a family relationship between two users
2. Post a diary entry from one user
3. Check if the other user receives a notification

## Platform-Specific Notes

### iOS (iPhone/iPad)
- Push notifications only work when the app is installed as a PWA
- Users must add the app to their home screen via Safari
- The system gracefully handles iOS limitations with local notifications
- Requires iOS 16.4+ for full PWA push notification support

### Android
- Works with Chrome, Edge, and other modern browsers
- Can work in browser or as installed PWA
- Supports rich notifications with actions and data

### Desktop
- Works with Chrome, Edge, Firefox
- Notifications appear as system notifications
- Full Web Push API support

## Monitoring and Debugging

### 1. Edge Function Logs
- View logs in Supabase Dashboard > Edge Functions
- Each function includes detailed logging for debugging

### 2. Client-side Debugging
- Open browser developer tools
- Check console for notification-related messages
- Test notification permission and subscription status

### 3. Database Monitoring
- Monitor `push_subscriptions` table for active subscriptions
- Check `notification_settings` for user preferences
- View notification trigger execution in database logs

## Security Considerations

1. **VAPID Keys**: Keep private keys secure and never expose them client-side
2. **FCM Server Key**: Store securely as environment variable only
3. **User Consent**: Always request permission before subscribing to notifications
4. **Data Privacy**: Notification content should not include sensitive information
5. **RLS Policies**: Database tables have Row Level Security enabled

## Troubleshooting

### Notifications Not Working
1. Check user has granted notification permission
2. Verify push subscription exists in database
3. Check notification settings for user
4. Verify FCM_SERVER_KEY is configured
5. Check Edge Function logs for errors

### iOS Notifications Not Working
1. Ensure app is installed as PWA (home screen)
2. Check iOS version (16.4+ required)
3. Verify Safari settings allow notifications
4. Test with different iOS devices/versions

### Daily Reminders Not Triggering
1. Set up cron job or scheduled task to call daily-reminder function
2. Use services like Vercel Cron, GitHub Actions, or cron-job.org
3. Schedule calls at regular intervals (e.g., every hour)

## Future Enhancements

1. **Rich Notifications**: Add action buttons and images
2. **Notification History**: Store and display notification history
3. **Advanced Scheduling**: More complex reminder schedules
4. **Push Notification Analytics**: Track delivery and engagement rates
5. **A/B Testing**: Test different notification content and timing

## Support

For issues or questions regarding the push notification system:
1. Check the Edge Function logs in Supabase Dashboard
2. Review browser console for client-side errors
3. Verify environment variables and configuration
4. Test with different devices and platforms