const { SlashCommandBuilder } = require('discord.js');
const { generateMetricsReport } = require('../../utils/metricsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('metrics-export')
        .setDescription('Export detailed metrics data')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Type of metrics to export')
                .setRequired(true)
                .addChoices(
                    { name: 'Tickets', value: 'tickets' },
                    { name: 'Payments', value: 'payments' },
                    { name: 'Events', value: 'events' },
                    { name: 'Social Media', value: 'social' },
                    { name: 'All', value: 'all' }
                ))
        .addStringOption(option =>
            option
                .setName('timeframe')
                .setDescription('Timeframe for export')
                .setRequired(true)
                .addChoices(
                    { name: 'Daily', value: 'daily' },
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Monthly', value: 'monthly' },
                    { name: 'Custom', value: 'custom' }
                ))
        .setDefaultMemberPermissions(0x0000000000000008), // Admin only

    async execute(interaction) {
        // Implementation will be similar to metrics.js but will generate CSV files
        // for detailed data export
    }
}; 