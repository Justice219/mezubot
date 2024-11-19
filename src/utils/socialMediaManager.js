const { TwitterApi } = require('twitter-api-v2');
const { IgApiClient } = require('instagram-private-api');
const YouTubeNotifier = require('youtube-notification-module');
const { EmbedBuilder } = require('discord.js');
const supabase = require('./supabase');

// Initialize Twitter client (only if credentials are provided)
const twitterClient = process.env.TWITTER_API_KEY ? new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
}) : null;

// Initialize Instagram client (only if credentials are provided)
const ig = new IgApiClient();
if (process.env.INSTAGRAM_USERNAME) {
    ig.state.generateDevice(process.env.INSTAGRAM_USERNAME);
}

// Initialize YouTube notifier (only if channel ID is provided and not placeholder)
const notifier = process.env.YOUTUBE_CHANNEL_ID && process.env.YOUTUBE_CHANNEL_ID !== 'your_youtube_channel_id' ? 
    new YouTubeNotifier({
        channels: [process.env.YOUTUBE_CHANNEL_ID],
        interval: 30000, // 30 seconds
    }) : null;

async function initializeSocialMedia(client) {
    try {
        let servicesInitialized = [];

        // Only initialize Instagram if credentials are provided and not placeholders
        if (process.env.INSTAGRAM_USERNAME && process.env.INSTAGRAM_USERNAME !== 'your_instagram_username') {
            try {
                await ig.simulate.preLoginFlow();
                await ig.account.login(process.env.INSTAGRAM_USERNAME, process.env.INSTAGRAM_PASSWORD);
                servicesInitialized.push('Instagram');
            } catch (error) {
                console.log('Instagram initialization skipped:', error.message);
            }
        }

        // Only initialize YouTube if channel ID is provided and not placeholder
        if (notifier) {
            try {
                notifier.on('video', async (video) => {
                    await handleYouTubeNotification(client, video);
                });
                notifier.subscribe();
                servicesInitialized.push('YouTube');
            } catch (error) {
                console.log('YouTube initialization skipped:', error.message);
            }
        }

        // Only initialize Twitter if credentials are provided and not placeholders
        if (twitterClient) {
            try {
                await startTwitterStream(client);
                servicesInitialized.push('Twitter');
            } catch (error) {
                console.log('Twitter initialization skipped:', error.message);
            }
        }

        if (servicesInitialized.length > 0) {
            console.log(`Social media monitoring initialized for: ${servicesInitialized.join(', ')}`);
        } else {
            console.log('No social media services were initialized. Check your environment variables if this is unexpected.');
        }
    } catch (error) {
        console.error('Error in social media initialization:', error);
    }
}

async function startTwitterStream(client) {
    try {
        const rules = await twitterClient.v2.streamRules();
        if (rules.data?.length) {
            await twitterClient.v2.updateStreamRules({
                delete: { ids: rules.data.map(rule => rule.id) }
            });
        }

        // Add rule to track your account's tweets
        await twitterClient.v2.updateStreamRules({
            add: [{ value: `from:${process.env.TWITTER_USERNAME}` }]
        });

        const stream = await twitterClient.v2.searchStream({
            'tweet.fields': ['created_at', 'text', 'author_id']
        });

        stream.on('data', async (tweet) => {
            await handleTwitterNotification(client, tweet);
        });

        stream.on('error', error => {
            console.error('Twitter stream error:', error);
        });
    } catch (error) {
        console.error('Error starting Twitter stream:', error);
    }
}

async function handleTwitterNotification(client, tweet) {
    try {
        const channel = await client.channels.fetch(process.env.SOCIAL_NOTIFICATIONS_CHANNEL_ID);
        
        const embed = new EmbedBuilder()
            .setTitle('New Tweet')
            .setDescription(tweet.data.text)
            .setURL(`https://twitter.com/user/status/${tweet.data.id}`)
            .setColor('#1DA1F2')
            .setTimestamp(new Date(tweet.data.created_at));

        await channel.send({ embeds: [embed] });
        
        // Log to database
        await logSocialPost('twitter', tweet.data.id, tweet.data.text);
    } catch (error) {
        console.error('Error handling Twitter notification:', error);
    }
}

async function handleYouTubeNotification(client, video) {
    try {
        const channel = await client.channels.fetch(process.env.SOCIAL_NOTIFICATIONS_CHANNEL_ID);
        
        const embed = new EmbedBuilder()
            .setTitle('New YouTube Video')
            .setDescription(video.title)
            .setURL(video.link)
            .setImage(video.thumbnail)
            .setColor('#FF0000')
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        
        // Log to database
        await logSocialPost('youtube', video.id, video.title);
    } catch (error) {
        console.error('Error handling YouTube notification:', error);
    }
}

async function checkInstagramUpdates(client) {
    try {
        const userFeed = ig.feed.user(process.env.INSTAGRAM_USER_ID);
        const posts = await userFeed.items();
        const lastPost = posts[0];

        // Check if this is a new post (you'll need to implement your own logic to track this)
        const isNewPost = await isPostNew(lastPost.id);
        
        if (isNewPost) {
            const channel = await client.channels.fetch(process.env.SOCIAL_NOTIFICATIONS_CHANNEL_ID);
            
            const embed = new EmbedBuilder()
                .setTitle('New Instagram Post')
                .setDescription(lastPost.caption?.text || 'No caption')
                .setImage(lastPost.image_versions2.candidates[0].url)
                .setURL(`https://instagram.com/p/${lastPost.code}`)
                .setColor('#E1306C')
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            
            // Log to database
            await logSocialPost('instagram', lastPost.id, lastPost.caption?.text || 'No caption');
        }
    } catch (error) {
        console.error('Error checking Instagram updates:', error);
    }
}

async function logSocialPost(platform, postId, content) {
    try {
        await supabase
            .from('social_media_posts')
            .insert([{
                platform,
                post_id: postId,
                content,
                posted_at: new Date()
            }]);
    } catch (error) {
        console.error('Error logging social post:', error);
    }
}

async function isPostNew(postId) {
    try {
        const { data } = await supabase
            .from('social_media_posts')
            .select()
            .eq('post_id', postId)
            .single();

        return !data;
    } catch (error) {
        console.error('Error checking if post is new:', error);
        return false;
    }
}

// Set up periodic Instagram checking
setInterval(async () => {
    const client = require('../index.js').client;
    await checkInstagramUpdates(client);
}, 300000); // Check every 5 minutes

module.exports = {
    initializeSocialMedia
}; 