# Linear Integration Setup

This guide explains how to set up the Linear integration for the Trailblaize workspace.

## Environment Variables

Add these to your `.env.local` file:

```bash
# Linear OAuth Configuration
LINEAR_CLIENT_ID=db428032f237779fa684afe30942600d
LINEAR_CLIENT_SECRET=your_client_secret_here
LINEAR_REDIRECT_URI=https://trailblaize.space/api/linear/callback

# Linear Webhook Configuration
LINEAR_WEBHOOK_SECRET=your_webhook_signing_secret_here
```

## Linear App Configuration

1. Go to [Linear Settings > API](https://linear.app/settings/api)
2. Create a new OAuth application or update existing one with:
   - **Redirect URI**: `https://trailblaize.space/api/linear/callback`
   - **Client ID**: `db428032f237779fa684afe30942600d`

3. Configure the webhook at Linear Settings > Webhooks:
   - **Webhook URL**: `https://trailblaize.space/api/linear/webhooks`
   - **Enabled Events**:
     - Issue attachments
     - Issue Labels
     - Project updates
     - Issues
     - Comments
     - Projects

## Database Setup

Run the SQL schema in your Supabase SQL Editor:

```sql
-- See lib/linear-oauth-schema.sql for full schema
```

This creates:

- `linear_oauth_tokens` - Stores OAuth tokens per employee
- `linear_teams` - Synced Linear teams
- `linear_projects` - Synced Linear projects
- `linear_issues` - Synced Linear issues
- `linear_labels` - Synced Linear labels
- `linear_issue_labels` - Issue-label relationships
- `linear_comments` - Synced comments
- `linear_attachments` - Synced attachments
- `linear_webhook_events` - Webhook audit log

## API Endpoints

### OAuth Flow

- `GET /api/linear/auth?employee_id={id}` - Initiates OAuth flow
- `GET /api/linear/callback` - Handles OAuth callback from Linear
- `GET /api/linear/status?employee_id={id}` - Check connection status
- `POST /api/linear/disconnect` - Disconnect Linear account

### Data Operations

- `GET /api/linear/issues?employee_id={id}` - Fetch issues (live or cached)
- `POST /api/linear/issues` - Create new issue in Linear
- `POST /api/linear/sync` - Manually sync all Linear data

### Webhooks

- `POST /api/linear/webhooks` - Receives Linear webhook events

## Usage in Frontend

### Connect Linear Account

```typescript
// Redirect to Linear OAuth
window.location.href = `/api/linear/auth?employee_id=${employee.id}`;
```

### Check Connection Status

```typescript
const response = await fetch(`/api/linear/status?employee_id=${employee.id}`);
const { connected, user, teams } = await response.json();
```

### Fetch Issues

```typescript
// Live from Linear API
const response = await fetch(`/api/linear/issues?employee_id=${employee.id}&source=live`);

// From cached/synced data
const response = await fetch(`/api/linear/issues?employee_id=${employee.id}&source=cache`);
```

### Create Issue

```typescript
const response = await fetch('/api/linear/issues', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: employee.id,
    teamId: 'your-team-id',
    title: 'Bug: Something is broken',
    description: 'Detailed description...',
    priority: 2, // 1=Urgent, 2=High, 3=Medium, 4=Low
  }),
});
```

## Webhook Event Processing

The webhook handler processes these events:

| Event Type    | Actions                | Description                     |
| ------------- | ---------------------- | ------------------------------- |
| Issue         | create, update, remove | Issue CRUD operations           |
| Comment       | create, update, remove | Comment changes                 |
| Project       | create, update, remove | Project changes                 |
| ProjectUpdate | create, update         | Project status/progress updates |
| IssueLabel    | create, update, remove | Label management                |
| Attachment    | create, update, remove | File attachments                |

All webhook events are logged to `linear_webhook_events` for debugging.

## Security

- Webhook signatures are verified using HMAC-SHA256
- OAuth tokens are stored encrypted in the database
- RLS policies restrict access to appropriate roles (founders, engineers)

## Troubleshooting

### Webhook not receiving events

1. Check webhook URL is correct in Linear settings
2. Verify `LINEAR_WEBHOOK_SECRET` matches Linear's signing secret
3. Check `linear_webhook_events` table for errors

### OAuth fails

1. Verify `LINEAR_CLIENT_ID` and `LINEAR_CLIENT_SECRET` are correct
2. Check redirect URI matches exactly
3. Ensure employee exists in database

### Issues not syncing

1. Check webhook events are being received
2. Run manual sync: `POST /api/linear/sync`
3. Verify Linear connection is active via `/api/linear/status`
