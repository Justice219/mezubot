const { SlashCommandBuilder } = require('discord.js');
const { createPaymentRequest } = require('../../utils/paymentManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('request-payment')
        .setDescription('Request a payment from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to request payment from')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount to request')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of the payment')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ticket_id')
                .setDescription('Associated ticket ID')
                .setRequired(true))
        .setDefaultMemberPermissions(0x0000000000000008), // Administrator permission

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getNumber('amount');
            const description = interaction.options.getString('description');
            const ticketId = interaction.options.getString('ticket_id');

            const { embed, row } = await createPaymentRequest(
                interaction,
                amount,
                description,
                user.id,
                ticketId
            );

            // Send payment request to the channel
            await interaction.channel.send({
                content: `Payment request for ${user}`,
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({
                content: 'Payment request has been sent!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Error executing payment request command:', error);
            await interaction.reply({
                content: 'There was an error processing your payment request.',
                ephemeral: true
            });
        }
    }
}; 