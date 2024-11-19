const { SlashCommandBuilder } = require('discord.js');
const { closeTicket } = require('../../utils/ticketManager');
const { checkPermission } = require('../../utils/permissionMiddleware');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for closing the ticket')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Check if user has permission to close tickets
            const hasPermission = await checkPermission(interaction, 'staff');
            if (!hasPermission) {
                return await interaction.reply({
                    content: 'You do not have permission to close tickets.',
                    ephemeral: true
                });
            }

            await closeTicket(interaction);
        } catch (error) {
            console.error('Error executing close command:', error);
            await interaction.reply({
                content: 'There was an error closing the ticket.',
                ephemeral: true
            });
        }
    }
}; 