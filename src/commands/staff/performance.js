const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generateMetricsReport } = require('../../utils/metricsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('performance')
        .setDescription('View staff performance metrics')
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
        .addUserOption(option =>
            option
                .setName('staff')
                .setDescription('Staff member to view (leave empty for self)')
                .setRequired(false))
        .setDefaultMemberPermissions(0x0000000000002000), // Staff permission

    async execute(interaction) {
        // Implementation for viewing staff performance metrics
    }
}; 