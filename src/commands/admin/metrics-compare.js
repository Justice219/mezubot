const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateMetricsReport } = require('../../utils/metricsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('metrics-compare')
        .setDescription('Compare metrics between two time periods')
        .addStringOption(option =>
            option
                .setName('period1')
                .setDescription('First time period')
                .setRequired(true)
                .addChoices(
                    { name: 'This Week', value: 'this_week' },
                    { name: 'Last Week', value: 'last_week' },
                    { name: 'This Month', value: 'this_month' },
                    { name: 'Last Month', value: 'last_month' }
                ))
        .addStringOption(option =>
            option
                .setName('period2')
                .setDescription('Second time period')
                .setRequired(true)
                .addChoices(
                    { name: 'This Week', value: 'this_week' },
                    { name: 'Last Week', value: 'last_week' },
                    { name: 'This Month', value: 'this_month' },
                    { name: 'Last Month', value: 'last_month' }
                ))
        .setDefaultMemberPermissions(0x0000000000000008), // Admin only

    async execute(interaction) {
        // Implementation for comparing metrics between two time periods
    }
}; 