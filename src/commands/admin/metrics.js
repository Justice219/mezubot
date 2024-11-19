const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateMetricsReport } = require('../../utils/metricsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('metrics')
        .setDescription('View server metrics')
        .addStringOption(option =>
            option
                .setName('timeframe')
                .setDescription('Timeframe for metrics')
                .setRequired(true)
                .addChoices(
                    { name: 'Daily', value: 'daily' },
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Monthly', value: 'monthly' }
                ))
        .setDefaultMemberPermissions(0x0000000000000008), // Admin only

    async execute(interaction) {
        try {
            const timeframe = interaction.options.getString('timeframe');
            const now = new Date();
            let startDate;

            switch (timeframe) {
                case 'daily':
                    startDate = new Date(now.setDate(now.getDate() - 1));
                    break;
                case 'weekly':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'monthly':
                    startDate = new Date(now.setMonth(now.getMonth() - 1));
                    break;
            }

            const metrics = await generateMetricsReport(interaction.guildId, startDate, new Date());

            if (!metrics) {
                await interaction.reply({
                    content: 'Error generating metrics report.',
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`Server Metrics - ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`)
                .setColor('#0099ff')
                .addFields(
                    {
                        name: '🎫 Ticket Metrics',
                        value: `Average Response Time: ${metrics.ticketMetrics.averageResponseTime}min\nTotal Tickets: ${metrics.ticketMetrics.totalTickets}`,
                        inline: true
                    },
                    {
                        name: '💰 Payment Metrics',
                        value: `Success Rate: ${metrics.paymentMetrics.successRate}%\nTotal Transactions: ${metrics.paymentMetrics.totalTransactions}`,
                        inline: true
                    },
                    {
                        name: '📅 Event Metrics',
                        value: `Average Attendance: ${metrics.eventMetrics.averageAttendanceRate}%\nTotal Events: ${metrics.eventMetrics.totalEvents}`,
                        inline: true
                    },
                    {
                        name: '📱 Social Media Metrics',
                        value: `Average Engagement: ${metrics.socialMetrics.averageEngagement}%\nTotal Posts: ${metrics.socialMetrics.totalPosts}`,
                        inline: true
                    }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing metrics command:', error);
            await interaction.reply({
                content: 'There was an error generating the metrics report.',
                ephemeral: true
            });
        }
    }
}; 