const { 
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const { createPaymentRequest } = require('../../utils/paymentManager');
const { checkPermission } = require('../../utils/permissionMiddleware');
const supabase = require('../../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Create a payment request for a ticket')
        .addNumberOption(option =>
            option
                .setName('amount')
                .setDescription('The amount to request (in USD)')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('Description of what this payment is for')
                .setRequired(true))
        .setDMPermission(false)
        .setDefaultMemberPermissions(0x0000000000002000),

    async execute(interaction) {
        try {
            // Check if user has staff permission
            const hasPermission = await checkPermission(interaction, 'staff');
            if (!hasPermission) {
                return await interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true
                });
            }

            // Check if in a ticket channel
            const channel = interaction.channel;
            const { data: ticket } = await supabase
                .from('tickets')
                .select('*')
                .eq('channel_id', channel.id)
                .single();

            if (!ticket) {
                return await interaction.reply({
                    content: 'This command can only be used in ticket channels.',
                    ephemeral: true
                });
            }

            const amount = interaction.options.getNumber('amount');
            const description = interaction.options.getString('description');

            // Create payment request
            const { embed, row } = await createPaymentRequest(
                interaction,
                amount,
                description,
                ticket.user_id,
                ticket.id
            );

            // Send payment request to channel
            await channel.send({
                content: `<@${ticket.user_id}>, a payment request has been created:`,
                embeds: [embed],
                components: [row]
            });

            // Confirm to staff member
            await interaction.reply({
                content: 'Payment request created successfully!',
                ephemeral: true
            });

        } catch (error) {
            console.error('Error creating payment request:', error);
            await interaction.reply({
                content: 'There was an error creating the payment request.',
                ephemeral: true
            });
        }
    }
}; 