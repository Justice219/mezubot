const { SlashCommandBuilder } = require('discord.js');
const { checkPermission } = require('../../utils/permissionMiddleware');
const supabase = require('../../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage ticket users')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the ticket')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the ticket')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to remove')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            // Check if this is a ticket channel
            const { data: ticket, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('channel_id', interaction.channel.id)
                .single();

            if (error || !ticket) {
                await interaction.reply({
                    content: 'This command can only be used in ticket channels.',
                    ephemeral: true
                });
                return;
            }

            // Check if user has permission
            const hasPermission = await checkPermission(interaction, 'staff');
            if (!hasPermission && ticket.user_id !== interaction.user.id) {
                await interaction.reply({
                    content: 'You do not have permission to manage ticket users.',
                    ephemeral: true
                });
                return;
            }

            const targetUser = interaction.options.getUser('user');
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'add') {
                // Add user to the ticket
                await interaction.channel.permissionOverwrites.edit(targetUser, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                await interaction.reply({
                    content: `Added ${targetUser} to the ticket.`,
                    ephemeral: false
                });
            } 
            else if (subcommand === 'remove') {
                // Don't allow removing the ticket creator or the claimer
                if (ticket.user_id === targetUser.id) {
                    await interaction.reply({
                        content: 'You cannot remove the ticket creator.',
                        ephemeral: true
                    });
                    return;
                }

                if (ticket.claimed_by === targetUser.id) {
                    await interaction.reply({
                        content: 'You cannot remove the staff member who claimed this ticket.',
                        ephemeral: true
                    });
                    return;
                }

                // Remove user from the ticket
                await interaction.channel.permissionOverwrites.delete(targetUser);

                await interaction.reply({
                    content: `Removed ${targetUser} from the ticket.`,
                    ephemeral: false
                });
            }
        } catch (error) {
            console.error('Error managing ticket users:', error);
            await interaction.reply({
                content: 'There was an error managing ticket users.',
                ephemeral: true
            });
        }
    }
}; 