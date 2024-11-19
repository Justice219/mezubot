const { SlashCommandBuilder } = require('discord.js');
const { createEvent } = require('../../utils/eventManager');
const supabase = require('../../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-event')
        .setDescription('Create a new event')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the event')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of the event')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('start_date')
                .setDescription('Event date')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('start_time')
                .setDescription('Time (e.g., 2:30 PM or 14:30)')
                .setRequired(true)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('max_participants')
                .setDescription('Maximum number of participants (optional)')
                .setRequired(false))
        .setDefaultMemberPermissions(0x0000000000000008),

    async execute(interaction) {
        try {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const dateStr = interaction.options.getString('start_date');
            const timeStr = interaction.options.getString('start_time');
            const maxParticipants = interaction.options.getInteger('max_participants');

            // Parse the date and time
            const startTime = new Date(`${dateStr} ${timeStr}`);

            // Validate if date is valid
            if (isNaN(startTime.getTime())) {
                await interaction.reply({
                    content: 'Invalid date or time format.',
                    ephemeral: true
                });
                return;
            }

            // Check if date is in the future
            if (startTime < new Date()) {
                await interaction.reply({
                    content: 'Event start time must be in the future.',
                    ephemeral: true
                });
                return;
            }

            // Get the configured events channel
            const { data: config } = await supabase
                .from('config')
                .select('value')
                .eq('guild_id', interaction.guildId)
                .eq('key', 'events_channel')
                .single();

            if (!config?.value) {
                await interaction.reply({
                    content: 'Events channel not configured. Please ask an admin to set it up using `/config`.',
                    ephemeral: true
                });
                return;
            }

            const eventsChannel = await interaction.guild.channels.cache.get(config.value);
            if (!eventsChannel) {
                await interaction.reply({
                    content: 'Configured events channel not found. Please ask an admin to check the configuration.',
                    ephemeral: true
                });
                return;
            }

            const { embed, row } = await createEvent(
                interaction,
                title,
                description,
                startTime,
                null, // endTime is optional and removed for simplicity
                maxParticipants
            );

            // Send event announcement to the configured channel
            await eventsChannel.send({
                content: '@everyone A new event has been created!',
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({
                content: `Event created successfully in ${eventsChannel}!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error creating event:', error);
            await interaction.reply({
                content: 'There was an error creating the event.',
                ephemeral: true
            });
        }
    }
}; 