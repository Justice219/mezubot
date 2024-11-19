const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    RoleSelectMenuBuilder
} = require('discord.js');
const supabase = require('../../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure bot settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('Bot Configuration')
                .setDescription('Select a configuration option below:')
                .setColor('#0099ff');

            // Create select menu for configuration options
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('config_select')
                .setPlaceholder('Choose a configuration option')
                .addOptions([
                    // Ticket Categories
                    {
                        label: 'Ticket Category',
                        description: 'Set the default category for ticket channels',
                        value: 'ticket_category',
                        emoji: '📁'
                    },
                    {
                        label: 'Application Category',
                        description: 'Set the category for application tickets',
                        value: 'application_category',
                        emoji: '📝'
                    },
                    {
                        label: 'Support Category',
                        description: 'Set the category for support tickets',
                        value: 'support_category',
                        emoji: '🎫'
                    },
                    {
                        label: 'Quote Category',
                        description: 'Set the category for quote tickets',
                        value: 'quote_category',
                        emoji: '💰'
                    },

                    // Notification Channels
                    {
                        label: 'Staff Channel',
                        description: 'Set the channel for staff notifications',
                        value: 'staff_channel',
                        emoji: '👥'
                    },
                    {
                        label: 'Application Notifications Channel',
                        description: 'Set the channel for application notifications',
                        value: 'application_notifications_channel',
                        emoji: '📢'
                    },
                    {
                        label: 'Support Notifications Channel',
                        description: 'Set the channel for support ticket notifications',
                        value: 'support_notifications_channel',
                        emoji: '📢'
                    },
                    {
                        label: 'Log Channel',
                        description: 'Set the channel for logging',
                        value: 'log_channel',
                        emoji: '📝'
                    },
                    {
                        label: 'Events Channel',
                        description: 'Set the channel for event announcements',
                        value: 'events_channel',
                        emoji: '📅'
                    },

                    // Role Management
                    {
                        label: 'Staff Roles',
                        description: 'Set the roles for staff commands',
                        value: 'staff_role',
                        emoji: '🛡️'
                    },
                    {
                        label: 'Claim Roles',
                        description: 'Set the roles for claiming tickets',
                        value: 'claim_role',
                        emoji: '✋'
                    },
                    {
                        label: 'Application Roles',
                        description: 'Set available roles for applications',
                        value: 'application_roles',
                        emoji: '📝'
                    },
                    {
                        label: 'Application Claim Roles',
                        description: 'Set roles that can claim applications',
                        value: 'application_claim_roles',
                        emoji: '✋'
                    },
                    {
                        label: 'Support Claim Roles',
                        description: 'Set roles that can claim support tickets',
                        value: 'support_claim_roles',
                        emoji: '✋'
                    }
                ]);

            const viewButton = new ButtonBuilder()
                .setCustomId('config_view')
                .setLabel('View Current Settings')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚙️');

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(viewButton);

            // Fetch current configuration for the embed
            const { data, error } = await supabase
                .from('config')
                .select('key, value')
                .eq('guild_id', interaction.guildId);

            if (!error && data && data.length > 0) {
                const fields = data.map(config => {
                    if (config.key.includes('role')) {
                        try {
                            const roleIds = JSON.parse(config.value);
                            const roles = roleIds.map(roleId => 
                                interaction.guild.roles.cache.get(roleId)
                            ).filter(role => role); // Filter out null/undefined roles
                            
                            return {
                                name: config.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                value: roles.length > 0 ? roles.map(role => role.toString()).join(', ') : 'No roles set',
                                inline: true
                            };
                        } catch (e) {
                            return {
                                name: config.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                value: 'Invalid configuration',
                                inline: true
                            };
                        }
                    } else {
                        const channel = interaction.guild.channels.cache.get(config.value);
                        return {
                            name: config.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            value: channel ? channel.toString() : 'Channel not found',
                            inline: true
                        };
                    }
                });
                embed.addFields(fields);
            } else {
                embed.addFields({ 
                    name: 'Current Settings', 
                    value: 'No configuration set yet.' 
                });
            }

            await interaction.reply({
                embeds: [embed],
                components: [row1, row2],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error executing config command:', error);
            await interaction.reply({
                content: 'There was an error executing this command.',
                ephemeral: true
            });
        }
    }
}; 