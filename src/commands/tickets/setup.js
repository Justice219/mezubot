const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-tickets')
        .setDescription('Sets up the ticket system embed with buttons')
        .setDefaultMemberPermissions(0x0000000000000008), // Administrator permission

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Support Ticket System')
            .setDescription('Click the appropriate button below to create a ticket:')
            .setColor('#0099ff')
            .addFields(
                { name: 'Quote Request', value: 'Get a quote for your project' },
                { name: 'Application', value: 'Apply for a position' },
                { name: 'Support', value: 'Get help with an existing service' }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_quote')
                    .setLabel('Quote')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('create_application')
                    .setLabel('Apply')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('create_support')
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({ content: 'Ticket system has been set up!', ephemeral: true });
    }
}; 