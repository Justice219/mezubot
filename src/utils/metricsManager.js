const supabase = require('./supabase');

// Ticket Response Time Metrics
async function trackTicketMetrics(ticketId, type, startTime, endTime) {
    try {
        const responseTime = endTime - startTime;
        await supabase
            .from('ticket_metrics')
            .insert({
                ticket_id: ticketId,
                type: type,
                response_time: responseTime,
                created_at: startTime,
                claimed_at: endTime
            });
    } catch (error) {
        console.error('Error tracking ticket metrics:', error);
    }
}

// Payment Tracking Metrics
async function trackPaymentMetrics(paymentId, status, amount) {
    try {
        await supabase
            .from('payment_metrics')
            .insert({
                payment_id: paymentId,
                status: status,
                amount: amount,
                timestamp: new Date()
            });
    } catch (error) {
        console.error('Error tracking payment metrics:', error);
    }
}

// Event Participation Metrics
async function trackEventMetrics(eventId, totalInvited, totalRSVP, actualAttendance) {
    try {
        await supabase
            .from('event_metrics')
            .insert({
                event_id: eventId,
                total_invited: totalInvited,
                total_rsvp: totalRSVP,
                actual_attendance: actualAttendance,
                timestamp: new Date()
            });
    } catch (error) {
        console.error('Error tracking event metrics:', error);
    }
}

// Social Media Engagement Metrics
async function trackSocialMetrics(postId, platform, clicks, impressions) {
    try {
        await supabase
            .from('social_metrics')
            .insert({
                post_id: postId,
                platform: platform,
                clicks: clicks,
                impressions: impressions,
                timestamp: new Date()
            });
    } catch (error) {
        console.error('Error tracking social metrics:', error);
    }
}

// Generate Metrics Report
async function generateMetricsReport(guildId, startDate, endDate) {
    try {
        const [tickets, payments, events, social] = await Promise.all([
            supabase
                .from('ticket_metrics')
                .select('*')
                .gte('created_at', startDate)
                .lte('created_at', endDate),
            supabase
                .from('payment_metrics')
                .select('*')
                .gte('timestamp', startDate)
                .lte('timestamp', endDate),
            supabase
                .from('event_metrics')
                .select('*')
                .gte('timestamp', startDate)
                .lte('timestamp', endDate),
            supabase
                .from('social_metrics')
                .select('*')
                .gte('timestamp', startDate)
                .lte('timestamp', endDate)
        ]);

        return {
            ticketMetrics: {
                averageResponseTime: calculateAverageResponseTime(tickets.data),
                totalTickets: tickets.data.length
            },
            paymentMetrics: {
                totalTransactions: payments.data.length,
                successRate: calculatePaymentSuccessRate(payments.data)
            },
            eventMetrics: {
                averageAttendanceRate: calculateEventAttendanceRate(events.data),
                totalEvents: events.data.length
            },
            socialMetrics: {
                averageEngagement: calculateSocialEngagement(social.data),
                totalPosts: social.data.length
            }
        };
    } catch (error) {
        console.error('Error generating metrics report:', error);
        return null;
    }
}

module.exports = {
    trackTicketMetrics,
    trackPaymentMetrics,
    trackEventMetrics,
    trackSocialMetrics,
    generateMetricsReport
}; 