# Mezu Bot

A powerful Discord bot designed to streamline server management with ticket systems, payment processing, event management, and social media integrations.

## Features

### Ticket Management
- Multiple ticket types (Support, Applications, Quotes)
- Automated ticket creation and routing
- Staff claim system
- Ticket transcripts and logging
- Performance metrics tracking

### Payment Processing
- PayPal integration
- Payment tracking and metrics
- Success rate monitoring
- Transaction history

### Event Management
- Event creation and scheduling
- RSVP system
- Attendance tracking
- Event metrics and analytics

### Social Media Integration
- Twitter, Instagram, and YouTube notifications
- Engagement tracking
- Social media metrics
- Automated posting capabilities

### Metrics & Analytics
- Comprehensive metrics dashboard
- Performance tracking
- Exportable reports
- Custom alerts system
- Comparative analysis tools

## Setup

### Prerequisites
- Node.js v16.9.0 or higher
- Discord Bot Token
- Supabase Account
- PayPal Developer Account
- Social Media API Access

### Environment Variables
Create a \`.env\` file in the root directory with the following:

\```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Channel IDs
TICKET_CHANNEL_ID=your_ticket_channel_id
STAFF_CHANNEL_ID=your_staff_channel_id
SOCIAL_NOTIFICATIONS_CHANNEL_ID=your_social_channel_id

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox_or_live

# Social Media Configuration
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password
YOUTUBE_CHANNEL_ID=your_youtube_channel_id
\```

### Installation

1. Clone the repository
\```bash
git clone https://github.com/yourusername/mezu-bot.git
cd mezu-bot
\```

2. Install dependencies
\```bash
npm install
\```

3. Deploy commands
\```bash
npm run deploy
\```

4. Start the bot
\```bash
npm run start
\```

## Commands

### Admin Commands
- \`/config\` - Configure bot settings and roles
- \`/metrics\` - View server metrics
- \`/metrics-export\` - Export detailed metrics data
- \`/metrics-compare\` - Compare metrics between periods
- \`/metrics-alert\` - Configure metric alerts
- \`/setup-tickets\` - Set up ticket system

### Staff Commands
- \`/performance\` - View staff performance metrics
- \`/ticket claim\` - Claim a ticket
- \`/ticket close\` - Close a ticket
- \`/ticket add\` - Add user to ticket
- \`/ticket remove\` - Remove user from ticket

### User Commands
- Quote Request Button - Create a quote ticket
- Apply Button - Create an application ticket
- Support Button - Create a support ticket

## Database Tables

### Required Supabase Tables

1. config
```sql
- guild_id (text)
- key (text)
- value (text)
```

2. tickets
```sql
- id (uuid)
- guild_id (text)
- channel_id (text)
- user_id (text)
- type (text)
- status (text)
- created_at (timestamp)
- claimed_by (text)
- claimed_at (timestamp)
- closed_by (text)
- closed_at (timestamp)
```

3. ticket_metrics
```sql
- ticket_id (uuid)
- type (text)
- response_time (int)
- created_at (timestamp)
- claimed_at (timestamp)
```

4. payment_metrics
```sql
- payment_id (text)
- status (text)
- amount (float)
- timestamp (timestamp)
```

5. event_metrics
```sql
- event_id (text)
- total_invited (int)
- total_rsvp (int)
- actual_attendance (int)
- timestamp (timestamp)
```

social_metrics
```sql
- post_id (text)
- platform (text)
- clicks (int)
- impressions (int)
- timestamp (timestamp)
```

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## Support

For support, please open an issue in the GitHub repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
