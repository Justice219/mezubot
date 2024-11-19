const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('metrics-alert')
        .setDescription('Configure metric alerts')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a metric alert')
                .addStringOption(option =>
                    option
                        .setName('metric')
                        .setDescription('Metric to monitor')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Response Time', value: 'response_time' },
                            { name: 'Payment Success Rate', value: 'payment_rate' },
                            { name: 'Event Attendance', value: 'attendance' },
                            { name: 'Social Engagement', value: 'engagement' }
                        ))
                .addNumberOption(option =>
                    option
                        .setName('threshold')
                        .setDescription('Alert threshold value')
                        .setRequired(true))
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel for alerts')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List current metric alerts'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a metric alert')
                .addStringOption(option =>
                    option
                        .setName('alert_id')
                        .setDescription('ID of the alert to remove')
                        .setRequired(true)))
        .setDefaultMemberPermissions(0x0000000000000008), // Admin only

    async execute(interaction) {
        // Implementation for setting up and managing metric alerts
    }
}; 