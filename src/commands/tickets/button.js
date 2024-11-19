const { 
    SlashCommandBuilder, 
    ChannelType, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const { setupTickets } = require('../../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('button')
        .setDescription('Manage ticket buttons')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create ticket buttons in a channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to create the buttons in')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit existing ticket buttons')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('The ID of the message with the buttons')
                        .setRequired(true))
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel containing the message')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .setDefaultMemberPermissions(0x0000000000000008), // Administrator permission

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'create') {
            const channel = interaction.options.getChannel('channel');
            
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

            await channel.send({
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({ 
                content: `Ticket buttons have been created in ${channel}`, 
                ephemeral: true 
            });
        } 
        else if (interaction.options.getSubcommand() === 'edit') {
            try {
                const messageId = interaction.options.getString('message_id');
                const channel = interaction.options.getChannel('channel');

                const message = await channel.messages.fetch(messageId);
                if (!message) {
                    await interaction.reply({
                        content: 'Could not find the specified message.',
                        ephemeral: true
                    });
                    return;
                }

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

                await message.edit({
                    embeds: [embed],
                    components: [row]
                });

                await interaction.reply({
                    content: 'Ticket buttons have been updated!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error editing ticket buttons:', error);
                await interaction.reply({
                    content: 'There was an error editing the ticket buttons.',
                    ephemeral: true
                });
            }
        }
    }
}; 