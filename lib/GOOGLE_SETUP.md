# Google Integration Setup Guide

This guide explains how to set up Google Calendar and Gmail integration for the Trailblaize workspace.

## Prerequisites

1. A Google Cloud Platform account
2. Access to your Supabase project

## Step 1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Calendar API
   - Gmail API

## Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**
2. Select **External** user type (unless you have Google Workspace)
3. Fill in the required fields:
   - App name: `Trailblaize Workspace`
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.labels`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (while in testing mode)

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/google/callback`
   - Production: `https://your-domain.com/api/google/callback`
5. Save the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

## Step 5: Run Database Migration

Execute the SQL schema in your Supabase SQL Editor:

```sql
-- Run the contents of lib/google-oauth-schema.sql
```

This creates the `google_oauth_tokens` table with Row Level Security policies.

## Step 6: Test the Integration

1. Start your development server
2. Navigate to `/workspace`
3. Click "Connect Google" on the calendar or Gmail widget
4. Authorize the application
5. You should see your calendar events and emails

## Troubleshooting

### "Access blocked: App not verified"

While in testing mode, only users added to the test users list can authorize. Add your email to the OAuth consent screen's test users.

### "Token expired" errors

The integration automatically refreshes tokens. If you see persistent errors, try disconnecting and reconnecting your Google account.

### Missing emails or calendar events

Ensure the Gmail API and Calendar API are enabled in your Google Cloud project.

## Security Notes

- OAuth tokens are stored encrypted in Supabase with Row Level Security
- Refresh tokens are used to maintain access without re-authentication
- Users can disconnect at any time from the workspace settings

## Production Checklist

Before going to production:

1. [ ] Submit OAuth consent screen for Google verification
2. [ ] Update redirect URI to production domain
3. [ ] Enable appropriate scopes for your use case
4. [ ] Test with multiple Google accounts
5. [ ] Implement proper error handling for API rate limits
