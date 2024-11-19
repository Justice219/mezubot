const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const supabase = require('./supabase');
const { trackTicketMetrics } = require('./metricsManager');

async function createTicket(interaction, ticketType) {
    // First check if required channels are configured
    const { data: channels } = await supabase
        .from('config')
        .select('key, value')
        .eq('guild_id', interaction.guildId)
        .in('key', [
            'ticket_category',
            'application_category',
            'support_category', 
            'quote_category',
            'application_notifications_channel',
            'support_notifications_channel',
            'staff_channel'
        ]);

    const configChannels = channels?.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    if (!configChannels?.ticket_category) {
        await interaction.reply({
            content: 'Ticket category not configured. Please contact an administrator.',
            ephemeral: true
        });
        return;
    }

    if (ticketType === 'application' && !configChannels?.application_notifications_channel) {
        await interaction.reply({
            content: 'Application notifications channel not configured. Please contact an administrator.',
            ephemeral: true
        });
        return;
    }

    if (ticketType === 'quote') {
        // Show modal for quote information
        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${ticketType}`)
            .setTitle('Quote Request Information');

        // Add form inputs
        const projectDescription = new TextInputBuilder()
            .setCustomId('projectDescription')
            .setLabel('Project Description')
            .setPlaceholder('Please describe your project in detail')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const budget = new TextInputBuilder()
            .setCustomId('budget')
            .setLabel('Budget')
            .setPlaceholder('What is your estimated budget?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const timeline = new TextInputBuilder()
            .setCustomId('timeline')
            .setLabel('Timeline')
            .setPlaceholder('When do you need this completed?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Add inputs to modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(projectDescription),
            new ActionRowBuilder().addComponents(budget),
            new ActionRowBuilder().addComponents(timeline)
        );

        // Show the modal
        await interaction.showModal(modal);
        return;
    }
    else if (ticketType === 'application') {
        // Get available application roles
        const { data: config } = await supabase
            .from('config')
            .select('value')
            .eq('guild_id', interaction.guildId)
            .eq('key', 'application_roles')
            .single();

        if (!config?.value) {
            await interaction.reply({
                content: 'No application roles have been configured. Please contact an administrator.',
                ephemeral: true
            });
            return;
        }

        try {
            const roleIds = JSON.parse(config.value);
            // Create a map of valid roles
            const availableRoles = roleIds.reduce((acc, roleId) => {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    acc[roleId] = {
                        id: roleId,
                        name: role.name
                    };
                }
                return acc;
            }, {});

            if (Object.keys(availableRoles).length === 0) {
                await interaction.reply({
                    content: 'No valid application roles found. Please contact an administrator.',
                    ephemeral: true
                });
                return;
            }

            // Create select menu for positions
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('application_position')
                        .setPlaceholder('Select a position')
                        .addOptions(
                            Object.values(availableRoles).map(role => ({
                                label: role.name,
                                value: role.id,
                                description: `Apply for ${role.name} position`
                            }))
                        )
                );

            // Store the role mapping in a temporary cache
            interaction.client.tickets = interaction.client.tickets || new Map();
            interaction.client.tickets.set(`application_roles_${interaction.user.id}`, availableRoles);

            // Send position selection message
            await interaction.reply({
                content: 'Please select the position you would like to apply for:',
                components: [row],
                ephemeral: true
            });
            return;

        } catch (error) {
            console.error('Error parsing application roles:', error);
            await interaction.reply({
                content: 'There was an error loading available positions. Please contact an administrator.',
                ephemeral: true
            });
            return;
        }
    }
    else if (ticketType === 'support') {
        // Show modal for support information
        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${ticketType}`)
            .setTitle('Support Request');

        // Add form inputs
        const issue = new TextInputBuilder()
            .setCustomId('issue')
            .setLabel('Issue')
            .setPlaceholder('What do you need help with?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const description = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setPlaceholder('Please describe your issue in detail')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const tried = new TextInputBuilder()
            .setCustomId('tried')
            .setLabel('What have you tried?')
            .setPlaceholder('What steps have you taken to resolve this?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        // Add inputs to modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(issue),
            new ActionRowBuilder().addComponents(description),
            new ActionRowBuilder().addComponents(tried)
        );

        // Show the modal
        await interaction.showModal(modal);
        return;
    }

    if (ticketType === 'support' && !configChannels?.support_notifications_channel) {
        await interaction.reply({
            content: 'Support notifications channel not configured. Please contact an administrator.',
            ephemeral: true
        });
        return;
    }

    if (ticketType === 'support' && !configChannels?.support_category) {
        await interaction.reply({
            content: 'Support category not configured. Please contact an administrator.',
            ephemeral: true
        });
        return;
    }

    if (ticketType === 'application' && !configChannels?.application_category) {
        await interaction.reply({
            content: 'Application category not configured. Please contact an administrator.',
            ephemeral: true
        });
        return;
    }

    if (ticketType === 'quote' && !configChannels?.quote_category) {
        await interaction.reply({
            content: 'Quote category not configured. Please contact an administrator.',
            ephemeral: true
        });
        return;
    }

    // For other ticket types, proceed with normal ticket creation
    await createTicketChannel(interaction, ticketType);
}

async function handleTicketModal(interaction) {
    const [_, modal, type, roleId] = interaction.customId.split('_');
    let formData = {};

    // Get notification channels
    const { data: channels } = await supabase
        .from('config')
        .select('key, value')
        .eq('guild_id', interaction.guildId)
        .in('key', ['staff_channel', 'application_notifications_channel', 'support_notifications_channel']);

    const configChannels = channels?.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    if (type === 'application') {
        // Get the role mapping from cache
        const roleMapping = interaction.client.tickets?.get(`application_roles_${interaction.user.id}`);
        const roleInfo = roleMapping?.[roleId];

        if (!roleInfo) {
            console.log('Role info not found:', {
                roleId,
                roleMapping,
                availableMappings: Array.from(interaction.client.tickets?.entries() || [])
            });
            await interaction.reply({
                content: 'Your application session has expired. Please try again.',
                ephemeral: true
            });
            return;
        }

        formData = {
            position: roleInfo.name,
            roleId: roleInfo.id,
            experience: interaction.fields.getTextInputValue('experience'),
            portfolio: interaction.fields.getTextInputValue('portfolio') || 'Not provided'
        };

        // Clean up the cache after successful form submission
        interaction.client.tickets.delete(`application_roles_${interaction.user.id}`);
    } else if (type === 'quote') {
        formData = {
            projectDescription: interaction.fields.getTextInputValue('projectDescription'),
            budget: interaction.fields.getTextInputValue('budget'),
            timeline: interaction.fields.getTextInputValue('timeline')
        };
    } else if (type === 'support') {
        formData = {
            issue: interaction.fields.getTextInputValue('issue'),
            description: interaction.fields.getTextInputValue('description'),
            tried: interaction.fields.getTextInputValue('tried')
        };
    }

    // Create the ticket channel
    const ticketData = await createTicketChannel(interaction, type, formData);
    if (!ticketData) return;

    // Create embed for the ticket channel
    const ticketEmbed = new EmbedBuilder()
        .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Ticket`)
        .setDescription(`Ticket created by ${interaction.user}`)
        .setColor('#0099ff')
        .setTimestamp();

    // Add form data to embed based on ticket type
    if (type === 'application') {
        const roleText = formData.position ? `<@&${formData.roleId}> (${formData.position})` : 'Role not found';
        ticketEmbed.addFields(
            { name: 'Position', value: roleText },
            { name: 'Experience', value: formData.experience }
        );
        if (formData.portfolio && formData.portfolio !== 'Not provided') {
            ticketEmbed.addFields({ name: 'Portfolio/Examples', value: formData.portfolio });
        }
    } else if (type === 'quote') {
        ticketEmbed.addFields(
            { name: 'Project Description', value: formData.projectDescription },
            { name: 'Budget', value: formData.budget },
            { name: 'Timeline', value: formData.timeline }
        );
    } else if (type === 'support') {
        ticketEmbed.addFields(
            { name: 'Issue', value: formData.issue },
            { name: 'Description', value: formData.description }
        );
        if (formData.tried) {
            ticketEmbed.addFields({ name: 'Steps Taken', value: formData.tried });
        }
    }

    // Get the created channel
    const channel = await interaction.guild.channels.cache.get(ticketData.channel_id);
    if (!channel) {
        await interaction.reply({
            content: 'There was an error creating the ticket channel.',
            ephemeral: true
        });
        return;
    }

    // Send the initial message in the ticket channel (without claim button)
    await channel.send({
        embeds: [ticketEmbed]
    });

    // Send notifications to appropriate channels (with claim button)
    if (type === 'application' && configChannels?.application_notifications_channel) {
        const notificationChannel = interaction.guild.channels.cache.get(configChannels.application_notifications_channel);
        if (notificationChannel) {
            // Create claim button for notification channel only
            const claimButton = new ButtonBuilder()
                .setCustomId(`claim_ticket_${ticketData.id}`)
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✋');

            const row = new ActionRowBuilder().addComponents(claimButton);

            await notificationChannel.send({
                embeds: [ticketEmbed],
                components: [row]
            });
        }
    } else if (type === 'support' && configChannels?.support_notifications_channel) {
        const notificationChannel = interaction.guild.channels.cache.get(configChannels.support_notifications_channel);
        if (notificationChannel) {
            // Create claim button for notification channel only
            const claimButton = new ButtonBuilder()
                .setCustomId(`claim_ticket_${ticketData.id}`)
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✋');

            const row = new ActionRowBuilder().addComponents(claimButton);

            // Create notification embed
            const notificationEmbed = new EmbedBuilder()
                .setTitle('New Support Ticket')
                .setDescription(`A new support ticket has been created by ${interaction.user}`)
                .addFields(
                    { name: 'Issue', value: formData.issue },
                    { name: 'Description', value: formData.description }
                )
                .setColor('#FFA500')  // Orange color
                .setTimestamp();

            if (formData.tried) {
                notificationEmbed.addFields({ name: 'Steps Taken', value: formData.tried });
            }

            await notificationChannel.send({
                embeds: [notificationEmbed],
                components: [row]
            });
        }
    }

    // Send notification to staff channel only for quote tickets
    if (type === 'quote') {
        await sendStaffNotification(interaction, type, ticketData.id, formData);
    }

    // Reply to the user
    await interaction.reply({
        content: `Your ticket has been created in ${channel}`,
        ephemeral: true
    });
}

async function createTicketChannel(interaction, ticketType, formData = null) {
    const guild = interaction.guild;
    const user = interaction.user;

    try {
        // Get ticket category and staff roles from config
        const { data: configs } = await supabase
            .from('config')
            .select('key, value')
            .eq('guild_id', guild.id)
            .in('key', [
                'ticket_category',
                'application_category',
                'support_category',
                'quote_category',
                'staff_roles'
            ]);

        // Get the appropriate category based on ticket type
        let categoryId;
        if (ticketType === 'application') {
            categoryId = configs?.find(c => c.key === 'application_category')?.value;
        } else if (ticketType === 'support') {
            categoryId = configs?.find(c => c.key === 'support_category')?.value;
        } else if (ticketType === 'quote') {
            categoryId = configs?.find(c => c.key === 'quote_category')?.value;
        }

        // Fall back to default ticket category if specific one not found
        if (!categoryId) {
            categoryId = configs?.find(c => c.key === 'ticket_category')?.value;
        }

        // Get parent category if configured
        const parentCategory = categoryId ? 
            await guild.channels.cache.get(categoryId) : null;

        // Parse staff roles
        const staffRoles = configs?.find(c => c.key === 'staff_roles')?.value ? JSON.parse(configs.find(c => c.key === 'staff_roles').value) : [];

        // Create base permission overwrites
        const permissionOverwrites = [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }
        ];

        // Add staff role permissions
        staffRoles.forEach(roleId => {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            });
        });

        // Create ticket channel
        const channel = await guild.channels.create({
            name: `ticket-${ticketType}-${user.username}`,
            type: ChannelType.GuildText,
            parent: parentCategory,
            permissionOverwrites: permissionOverwrites,
        });

        // After creating the channel, add a close button
        const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Ticket`)
            .setDescription('Welcome to your ticket! Staff will be with you shortly.\nClick the button below to close this ticket when resolved.')
            .setColor('#0099ff')
            .setTimestamp();

        await channel.send({
            embeds: [welcomeEmbed],
            components: [row]
        });

        // Create ticket in database
        const { data: ticket, error } = await supabase
            .from('tickets')
            .insert([
                {
                    channel_id: channel.id,
                    user_id: user.id,
                    type: ticketType,
                    status: 'open',
                    created_at: new Date(),
                    guild_id: guild.id,
                    form_data: formData // Store form data if provided
                },
            ])
            .select()
            .single();

        if (error) throw error;

        return ticket;
    } catch (error) {
        console.error('Error creating ticket:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: 'There was an error creating your ticket. Please try again.',
                ephemeral: true
            });
        }
        return null;
    }
}

async function sendStaffNotification(interaction, ticketType, ticketId, formData = null) {
    try {
        // Get the appropriate channel based on ticket type
        const channelKey = ticketType === 'quote' ? 'staff_channel' : 
                          ticketType === 'application' ? 'application_channel' : 
                          'support_channel';

        const { data: configs } = await supabase
            .from('config')
            .select('value')
            .eq('key', channelKey)
            .eq('guild_id', interaction.guildId)
            .single();

        if (!configs?.value) {
            console.log(`No ${channelKey} configured for guild ${interaction.guildId}`);
            return;
        }

        const notificationChannel = await interaction.guild.channels.cache.get(configs.value);
        if (!notificationChannel) {
            console.log(`Could not find ${channelKey} channel ${configs.value} for guild ${interaction.guildId}`);
            return;
        }

        const staffEmbed = new EmbedBuilder()
            .setTitle(`New ${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Ticket`)
            .setDescription(`A new ${ticketType} ticket has been created by ${interaction.user}`)
            .setColor('#FFA500')
            .setTimestamp();

        // Add fields based on ticket type
        if (ticketType === 'quote') {
            staffEmbed.addFields(
                { name: 'Project Description', value: formData.projectDescription.substring(0, 1024), inline: false },
                { name: 'Budget', value: formData.budget, inline: true },
                { name: 'Timeline', value: formData.timeline, inline: true }
            );
        }
        else if (ticketType === 'application') {
            staffEmbed.addFields(
                { name: 'Position', value: formData.position, inline: true },
                { name: 'Experience', value: formData.experience.substring(0, 1024), inline: false }
            );
            if (formData.portfolio) {
                staffEmbed.addFields({ name: 'Portfolio/Examples', value: formData.portfolio, inline: false });
            }
        }
        else if (ticketType === 'support') {
            staffEmbed.addFields(
                { name: 'Issue', value: formData.issue, inline: true },
                { name: 'Description', value: formData.description.substring(0, 1024), inline: false }
            );
            if (formData.tried) {
                staffEmbed.addFields({ name: 'Steps Taken', value: formData.tried.substring(0, 1024), inline: false });
            }
        }

        const claimButton = new ButtonBuilder()
            .setCustomId(`claim_ticket_${ticketId}`)
            .setLabel('Claim Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫');

        const row = new ActionRowBuilder().addComponents(claimButton);

        await notificationChannel.send({
            embeds: [staffEmbed],
            components: [row]
        });
    } catch (error) {
        console.error('Error sending staff notification:', error);
    }
}

async function claimTicket(interaction) {
    try {
        const ticketId = interaction.customId.split('_')[2];
        const staffMember = interaction.member;

        // Get ticket information
        const { data: existingTicket, error: fetchError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (fetchError) throw fetchError;

        // Check if user has permission to claim this type of ticket
        let hasPermission = false;
        if (existingTicket.type === 'application') {
            const { data: claimRoles } = await supabase
                .from('config')
                .select('value')
                .eq('guild_id', interaction.guildId)
                .eq('key', 'application_claim_roles')
                .single();

            if (claimRoles?.value) {
                const allowedRoles = JSON.parse(claimRoles.value);
                hasPermission = staffMember.roles.cache.some(role => allowedRoles.includes(role.id));
            }
        } else if (existingTicket.type === 'support') {
            const { data: claimRoles } = await supabase
                .from('config')
                .select('value')
                .eq('guild_id', interaction.guildId)
                .eq('key', 'support_claim_roles')
                .single();

            if (claimRoles?.value) {
                const allowedRoles = JSON.parse(claimRoles.value);
                hasPermission = staffMember.roles.cache.some(role => allowedRoles.includes(role.id));
            }
        } else {
            // Check regular claim roles for other ticket types
            const { data: claimRoles } = await supabase
                .from('config')
                .select('value')
                .eq('guild_id', interaction.guildId)
                .eq('key', 'claim_role')
                .single();

            if (claimRoles?.value) {
                const allowedRoles = JSON.parse(claimRoles.value);
                hasPermission = staffMember.roles.cache.some(role => allowedRoles.includes(role.id));
            }
        }

        if (!hasPermission) {
            await interaction.reply({
                content: 'You do not have permission to claim this ticket.',
                ephemeral: true
            });
            return;
        }

        // Update ticket in database
        const { data: updatedTicket, error: updateError } = await supabase
            .from('tickets')
            .update({
                claimed_by: staffMember.id,
                claimed_at: new Date(),
                status: 'claimed'
            })
            .eq('id', ticketId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Get the ticket channel
        const channel = await interaction.guild.channels.cache.get(updatedTicket.channel_id);
        if (!channel) throw new Error('Ticket channel not found');

        // Add staff member to the channel with proper permissions
        await channel.permissionOverwrites.edit(staffMember, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true  // Allow managing messages in the ticket
        });

        // Update the claim button
        const claimedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#00FF00')
            .spliceFields(2, 1, { name: 'Status', value: 'Claimed by ' + staffMember.toString(), inline: true });

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`claimed_${ticketId}`)
                .setLabel('Claimed')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
                .setDisabled(true)
        );

        await interaction.message.edit({
            embeds: [claimedEmbed],
            components: [disabledRow]
        });

        // Send notification in ticket channel
        const notificationEmbed = new EmbedBuilder()
            .setTitle('Ticket Claimed')
            .setDescription(`This ticket has been claimed by ${staffMember}`)
            .setColor('#00FF00')
            .setTimestamp();

        await channel.send({ embeds: [notificationEmbed] });

        await interaction.reply({
            content: `You have successfully claimed the ticket in ${channel}`,
            ephemeral: true
        });

        // Add metrics tracking
        await trackTicketMetrics(
            ticketId,
            existingTicket.type,
            new Date(existingTicket.created_at),
            new Date()
        );

    } catch (error) {
        console.error('Error claiming ticket:', error);
        await interaction.reply({
            content: 'There was an error claiming the ticket.',
            ephemeral: true
        });
    }
}

async function closeTicket(interaction) {
    try {
        const channel = interaction.channel;

        // Get ticket from database
        const { data: ticket, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('channel_id', channel.id)
            .single();

        if (error) throw error;
        if (!ticket) {
            await interaction.reply({
                content: 'This command can only be used in ticket channels.',
                ephemeral: true
            });
            return;
        }

        // Create ticket transcript
        const transcript = await createTicketTranscript(channel, ticket);

        // Get log channel from config
        const { data: config } = await supabase
            .from('config')
            .select('value')
            .eq('guild_id', interaction.guildId)
            .eq('key', 'log_channel')
            .single();

        if (config?.value) {
            const logChannel = await interaction.guild.channels.cache.get(config.value);
            if (logChannel) {
                // Create log embed
                const logEmbed = new EmbedBuilder()
                    .setTitle('Ticket Closed')
                    .setDescription(`Ticket #${ticket.id} has been closed`)
                    .addFields(
                        { name: 'Type', value: ticket.type, inline: true },
                        { name: 'User', value: `<@${ticket.user_id}>`, inline: true },
                        { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Created At', value: new Date(ticket.created_at).toLocaleString(), inline: true },
                        { name: 'Closed At', value: new Date().toLocaleString(), inline: true }
                    )
                    .setColor('#FF0000')
                    .setTimestamp();

                // Send log with transcript
                await logChannel.send({
                    embeds: [logEmbed],
                    files: [transcript]
                });
            }
        }

        // Update ticket status in database
        await supabase
            .from('tickets')
            .update({
                status: 'closed',
                closed_at: new Date(),
                closed_by: interaction.user.id
            })
            .eq('id', ticket.id);

        // Send confirmation message
        await interaction.reply({
            content: 'This ticket will be closed in 5 seconds...',
            ephemeral: true
        });

        // Delete channel after delay
        setTimeout(async () => {
            await channel.delete();
        }, 5000);

    } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.reply({
            content: 'There was an error closing the ticket.',
            ephemeral: true
        });
    }
}

async function createTicketTranscript(channel, ticket) {
    try {
        let messages = [];
        let lastId = null;
        
        // Fetch all messages in the channel
        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;
            
            const fetchedMessages = await channel.messages.fetch(options);
            if (fetchedMessages.size === 0) break;
            
            messages = [...messages, ...fetchedMessages.values()];
            lastId = fetchedMessages.last().id;
        }

        // Sort messages by timestamp
        messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        // Create transcript content
        let content = `Ticket Transcript - #${ticket.id}\n`;
        content += `Type: ${ticket.type}\n`;
        content += `Created At: ${new Date(ticket.created_at).toLocaleString()}\n`;
        content += `User: ${channel.guild.members.cache.get(ticket.user_id)?.user.tag || ticket.user_id}\n\n`;
        content += `${'-'.repeat(50)}\n\n`;

        // Add messages to transcript
        for (const message of messages) {
            content += `[${message.createdAt.toLocaleString()}] ${message.author.tag}:\n`;
            content += `${message.content}\n`;
            if (message.attachments.size > 0) {
                content += `Attachments: ${message.attachments.map(a => a.url).join(', ')}\n`;
            }
            content += '\n';
        }

        // Create transcript file
        const buffer = Buffer.from(content, 'utf-8');
        return {
            attachment: buffer,
            name: `ticket-${ticket.id}-transcript.txt`
        };

    } catch (error) {
        console.error('Error creating transcript:', error);
        throw error;
    }
}

module.exports = {
    createTicket,
    handleTicketModal,
    claimTicket,
    closeTicket,
    createTicketTranscript
}; 