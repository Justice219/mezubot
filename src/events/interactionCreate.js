const { createTicket, claimTicket, handleTicketModal, closeTicket, createTicketTranscript } = require('../utils/ticketManager');
const { updatePaymentStatus, requestRefund, checkPaymentStatus } = require('../utils/paymentManager');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { updateEventParticipant, getEvent, getEventParticipants, createEventEmbed, createEventButtons } = require('../utils/eventManager');
const { checkPermission } = require('../utils/permissionMiddleware');
const supabase = require('../utils/supabase');
const { EmbedBuilder } = require('discord.js');
const { StringSelectMenuBuilder } = require('discord.js');
const { RoleSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) {
                    console.log(`Command not found: ${interaction.commandName}`);
                    return;
                }

                try {
                    if (command.permission && !(await checkPermission(interaction, command.permission))) {
                        return;
                    }

                    // Check if subcommand is required but not provided
                    const subcommands = command.data.options?.filter(opt => opt.type === 1);
                    if (subcommands?.length > 0 && !interaction.options.getSubcommand(false)) {
                        await interaction.reply({
                            content: 'Please specify a subcommand. Available subcommands: ' + 
                                    subcommands.map(sub => `\`${sub.name}\``).join(', '),
                            ephemeral: true
                        });
                        return;
                    }

                    await command.execute(interaction);
                } catch (error) {
                    console.error(`Error executing command ${interaction.commandName}:`, error);
                    
                    // Check if interaction has already been replied to
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            content: 'There was an error executing this command!',
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: 'There was an error executing this command!',
                            ephemeral: true
                        });
                    }
                }
            }

            if (interaction.isButton()) {
                const { customId } = interaction;
                
                if (customId.startsWith('create_')) {
                    const ticketType = customId.split('_')[1];
                    await createTicket(interaction, ticketType);
                    return;
                }

                if (customId.startsWith('claim_ticket_')) {
                    // Check if user has claim permission
                    const hasPermission = await checkPermission(interaction, 'claim');
                    if (!hasPermission) {
                        await interaction.reply({
                            content: 'You do not have permission to claim tickets.',
                            ephemeral: true
                        });
                        return;
                    }

                    await claimTicket(interaction);
                    return;
                }

                if (customId.startsWith('pay_')) {
                    if (!(await checkPermission(interaction, 'ManagePayments'))) return;
                    const paymentId = customId.split('_')[1];
                    // Here you would integrate with your payment gateway
                    // For now, we'll just update the status
                    try {
                        await updatePaymentStatus(paymentId, 'completed');
                        await interaction.reply({
                            content: 'Payment completed successfully!',
                            ephemeral: true
                        });
                        
                        // Update the original message
                        const message = interaction.message;
                        const embed = message.embeds[0];
                        embed.data.fields.find(f => f.name === 'Status').value = 'Completed';
                        embed.data.color = 0x00FF00; // Green

                        const row = message.components[0];
                        row.components[0].setDisabled(true);
                        row.components[1].setDisabled(false);

                        await message.edit({
                            embeds: [embed],
                            components: [row]
                        });
                    } catch (error) {
                        await interaction.reply({
                            content: 'There was an error processing your payment.',
                            ephemeral: true
                        });
                    }
                    return;
                }

                if (customId.startsWith('refund_request_')) {
                    const paymentId = customId.split('_')[2];
                    // Create a modal for refund reason
                    const modal = new ModalBuilder()
                        .setCustomId(`refund_modal_${paymentId}`)
                        .setTitle('Refund Request');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('refund_reason')
                        .setLabel('Reason for refund')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
                    modal.addComponents(firstActionRow);

                    await interaction.showModal(modal);
                    return;
                }

                if (customId.startsWith('check_payment_')) {
                    const paymentId = customId.split('_')[2];
                    try {
                        const result = await checkPaymentStatus(paymentId);
                        const status = result.status;
                        
                        if (status === 'completed' || status === 'approved') {
                            // Update the original message
                            const message = interaction.message;
                            const embed = message.embeds[0];
                            embed.data.fields.find(f => f.name === 'Status').value = 'Completed';
                            embed.data.color = 0x00FF00; // Green

                            const row = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel('View Payment Details')
                                        .setStyle(ButtonStyle.Link)
                                        .setURL(result.receiptUrl || 'https://www.paypal.com/activity/payment/' + payment.paypal_order_id)
                                );

                            await message.edit({
                                embeds: [embed],
                                components: []
                            });

                            await interaction.reply({
                                content: 'Payment has been completed!',
                                ephemeral: true
                            });
                        } else {
                            await interaction.reply({
                                content: `Payment status: ${status}. Please complete the payment using the PayPal link.`,
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        console.error('Error checking payment status:', error);
                        await interaction.reply({
                            content: 'There was an error checking the payment status.',
                            ephemeral: true
                        });
                    }
                    return;
                }

                if (customId.startsWith('event_')) {
                    try {
                        const [, status, eventId] = customId.split('_');
                        // Map button status to database enum values
                        const statusMap = {
                            'join': 'join',
                            'maybe': 'maybe',
                            'decline': 'declined'
                        };

                        const dbStatus = statusMap[status];
                        if (!dbStatus) {
                            throw new Error('Invalid status');
                        }

                        await updateEventParticipant(eventId, interaction.user.id, dbStatus);
                        
                        // Get updated event and participant info
                        const event = await getEvent(eventId);
                        const participants = await getEventParticipants(eventId);
                        
                        // Update the event message
                        const embed = createEventEmbed(event, participants);
                        const row = createEventButtons(eventId);
                        
                        await interaction.message.edit({
                            embeds: [embed],
                            components: [row]
                        });
                        
                        await interaction.reply({
                            content: `You have marked yourself as ${status} for this event.`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Error handling event interaction:', error);
                        await interaction.reply({
                            content: 'There was an error updating your RSVP status.',
                            ephemeral: true
                        });
                    }
                    return;
                }

                if (customId === 'config_view') {
                    const { data, error } = await supabase
                        .from('config')
                        .select('key, value')
                        .eq('guild_id', interaction.guildId);

                    if (error) {
                        await interaction.reply({
                            content: 'There was an error fetching the configuration.',
                            ephemeral: true
                        });
                        return;
                    }

                    if (!data || data.length === 0) {
                        await interaction.reply({
                            content: 'No configuration set yet.',
                            ephemeral: true
                        });
                        return;
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('Current Configuration')
                        .setColor('#0099ff')
                        .addFields(
                            data.map(config => ({
                                name: config.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                value: interaction.guild.channels.cache.get(config.value)?.toString() || 'Invalid Channel',
                                inline: true
                            }))
                        );

                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                }

                if (customId.startsWith('delete_payment_')) {
                    // Check if user has permission to delete payment requests
                    if (!(await checkPermission(interaction, 'ManagePayments'))) {
                        await interaction.reply({
                            content: 'You do not have permission to delete payment requests.',
                            ephemeral: true
                        });
                        return;
                    }

                    const paymentId = customId.split('_')[2];
                    try {
                        // Delete payment from database
                        const { error } = await supabase
                            .from('payments')
                            .delete()
                            .eq('id', paymentId);

                        if (error) throw error;

                        // Delete the message containing the payment request
                        await interaction.message.delete();

                        await interaction.reply({
                            content: 'Payment request has been deleted.',
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Error deleting payment request:', error);
                        await interaction.reply({
                            content: 'There was an error deleting the payment request.',
                            ephemeral: true
                        });
                    }
                    return;
                }

                if (customId === 'close_ticket') {
                    // Check if user has permission to close tickets
                    const hasPermission = await checkPermission(interaction, 'staff');
                    if (!hasPermission) {
                        await interaction.reply({
                            content: 'You do not have permission to close tickets.',
                            ephemeral: true
                        });
                        return;
                    }

                    await closeTicket(interaction);
                    return;
                }
            }

            // Handle modal submissions
            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('refund_modal_')) {
                    const paymentId = interaction.customId.split('_')[2];
                    const reason = interaction.fields.getTextInputValue('refund_reason');

                    try {
                        await requestRefund(paymentId, reason);
                        await interaction.reply({
                            content: 'Refund request submitted successfully!',
                            ephemeral: true
                        });

                        // Update the original message
                        const message = interaction.message;
                        const embed = message.embeds[0];
                        embed.data.fields.find(f => f.name === 'Status').value = 'Refund Requested';
                        embed.data.color = 0xFF0000; // Red

                        await message.edit({
                            embeds: [embed],
                            components: [] // Remove all buttons
                        });
                    } catch (error) {
                        await interaction.reply({
                            content: 'There was an error submitting your refund request.',
                            ephemeral: true
                        });
                    }
                    return;
                }

                if (interaction.customId.startsWith('ticket_modal_')) {
                    const [_, modal, type, roleId] = interaction.customId.split('_');
                    
                    // Only check role mapping for application tickets
                    if (type === 'application') {
                        const roleMapping = interaction.client.tickets?.get(`application_roles_${interaction.user.id}`);
                        if (!roleMapping || !roleMapping[roleId]) {
                            console.log('Role mapping not found:', {
                                roleId,
                                userRoleMapping: roleMapping,
                                availableMappings: Array.from(interaction.client.tickets?.entries() || [])
                            });
                            await interaction.reply({
                                content: 'Your application session has expired. Please try again.',
                                ephemeral: true
                            });
                            return;
                        }
                    }

                    await handleTicketModal(interaction);
                    return;
                }
            }

            // Handle select menu interactions
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'config_select') {
                    const key = interaction.values[0];
                    
                    if (key.includes('role')) {
                        // Get available roles, excluding @everyone
                        const availableRoles = interaction.guild.roles.cache
                            .filter(role => role.id !== interaction.guild.id)
                            .map(role => ({
                                label: role.name,
                                value: role.id,
                                description: `Role ID: ${role.id}`
                            }));

                        // Check if there are any roles to select from
                        if (availableRoles.length === 0) {
                            await interaction.reply({
                                content: 'No roles available to select from. Please create some roles first.',
                                ephemeral: true
                            });
                            return;
                        }

                        // Create role select menu
                        const roleSelect = new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`config_role_${key}`)
                                    .setPlaceholder('Select roles')
                                    .setMinValues(1)
                                    .setMaxValues(Math.min(availableRoles.length, 25)) // Limit to available roles or 25
                                    .addOptions(availableRoles)
                            );

                        // Get current roles
                        const { data: currentConfig } = await supabase
                            .from('config')
                            .select('value')
                            .eq('guild_id', interaction.guildId)
                            .eq('key', key)
                            .single();

                        let currentRoles = [];
                        if (currentConfig?.value) {
                            try {
                                currentRoles = JSON.parse(currentConfig.value);
                            } catch (e) {
                                currentRoles = [currentConfig.value]; // Convert old single-role format
                            }
                        }

                        const embed = new EmbedBuilder()
                            .setTitle(`Configure ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
                            .setDescription('Select one or more roles below.')
                            .setColor('#0099ff');

                        if (currentRoles.length > 0) {
                            embed.addFields({
                                name: 'Current Roles',
                                value: currentRoles.map(roleId => {
                                    const role = interaction.guild.roles.cache.get(roleId);
                                    return role ? role.toString() : 'Invalid Role';
                                }).join(', ') || 'None'
                            });
                        }

                        await interaction.reply({
                            embeds: [embed],
                            components: [roleSelect],
                            ephemeral: true
                        });
                    } else {
                        // Existing channel select menu code
                        const channelSelect = new ActionRowBuilder()
                            .addComponents(
                                new ChannelSelectMenuBuilder()
                                    .setCustomId(`config_${key.includes('category') ? 'category' : 'channel'}_${key}`)
                                    .setPlaceholder(`Select a ${key.includes('category') ? 'category' : 'channel'}`)
                                    .addChannelTypes(key.includes('category') ? ChannelType.GuildCategory : ChannelType.GuildText)
                            );

                        await interaction.reply({
                            content: `Please select a ${key.includes('category') ? 'category' : 'channel'} for ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:`,
                            components: [channelSelect],
                            ephemeral: true
                        });
                    }
                }

                if (interaction.customId === 'application_position') {
                    const selectedRoleId = interaction.values[0];
                    const selectedRole = interaction.guild.roles.cache.get(selectedRoleId);

                    if (!selectedRole) {
                        await interaction.reply({
                            content: 'The selected role no longer exists. Please try again.',
                            ephemeral: true
                        });
                        return;
                    }

                    // Create modal for application details
                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_modal_application_${selectedRoleId}`)
                        .setTitle('Application Information');

                    const experience = new TextInputBuilder()
                        .setCustomId('experience')
                        .setLabel('Experience')
                        .setPlaceholder('Tell us about your relevant experience')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    const portfolio = new TextInputBuilder()
                        .setCustomId('portfolio')
                        .setLabel('Portfolio/Examples')
                        .setPlaceholder('Links to your work (if applicable)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(experience),
                        new ActionRowBuilder().addComponents(portfolio)
                    );

                    await interaction.showModal(modal);
                }
            }

            // Update role select menu handler
            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('config_role_')) {
                const key = interaction.customId.replace('config_role_', '');
                const selectedRoles = interaction.values; // Now an array

                try {
                    // First, check if a configuration already exists
                    const { data: existingConfig } = await supabase
                        .from('config')
                        .select('*')
                        .eq('guild_id', interaction.guildId)
                        .eq('key', key)
                        .single();

                    let result;
                    if (existingConfig) {
                        // If exists, update
                        result = await supabase
                            .from('config')
                            .update({
                                value: JSON.stringify(selectedRoles)
                            })
                            .eq('guild_id', interaction.guildId)
                            .eq('key', key)
                            .select()
                            .single();
                    } else {
                        // If doesn't exist, insert
                        result = await supabase
                            .from('config')
                            .insert({
                                guild_id: interaction.guildId,
                                key: key,
                                value: JSON.stringify(selectedRoles)
                            })
                            .select()
                            .single();
                    }

                    if (result.error) throw result.error;

                    const rolesList = selectedRoles.map(roleId => {
                        const role = interaction.guild.roles.cache.get(roleId);
                        return role ? role.toString() : 'Invalid Role';
                    }).join(', ');

                    await interaction.reply({
                        content: `Successfully set ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} to: ${rolesList}`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error updating configuration:', error);
                    await interaction.reply({
                        content: 'There was an error updating the configuration.',
                        ephemeral: true
                    });
                }
            }

            // Handle channel select interactions
            if (interaction.isChannelSelectMenu()) {
                const customId = interaction.customId;
                if (customId.startsWith('config_channel_') || customId.startsWith('config_category_')) {
                    const key = customId.split('_').slice(2).join('_'); // Get the key part after config_channel_ or config_category_
                    const selectedChannel = interaction.channels.first();

                    try {
                        // First, check if configuration exists
                        const { data: existingConfig } = await supabase
                            .from('config')
                            .select('*')
                            .eq('guild_id', interaction.guildId)
                            .eq('key', key)
                            .single();

                        let result;
                        if (existingConfig) {
                            // If exists, update
                            result = await supabase
                                .from('config')
                                .update({
                                    value: selectedChannel.id
                                })
                                .eq('guild_id', interaction.guildId)
                                .eq('key', key)
                                .select()
                                .single();
                        } else {
                            // If doesn't exist, insert
                            result = await supabase
                                .from('config')
                                .insert({
                                    guild_id: interaction.guildId,
                                    key: key,
                                    value: selectedChannel.id
                                })
                                .select()
                                .single();
                        }

                        if (result.error) throw result.error;

                        await interaction.reply({
                            content: `Successfully set ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} to ${selectedChannel}`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Error updating channel configuration:', error);
                        await interaction.reply({
                            content: 'There was an error updating the configuration.',
                            ephemeral: true
                        });
                    }
                }
            }

            // Add this new section to handle autocomplete
            if (interaction.isAutocomplete()) {
                const command = interaction.commandName;
                const focusedOption = interaction.options.getFocused(true);

                if (command === 'create-event') {
                    if (focusedOption.name === 'start_date') {
                        // Generate next 30 days as options
                        const dateOptions = [];
                        for (let i = 0; i < 30; i++) {
                            const date = new Date();
                            date.setDate(date.getDate() + i);
                            dateOptions.push({
                                name: date.toLocaleDateString('en-US', { 
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }),
                                value: date.toISOString().split('T')[0]
                            });
                        }
                        
                        await interaction.respond(
                            dateOptions.filter(option => 
                                option.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                            ).slice(0, 25)
                        );
                    }
                    else if (focusedOption.name === 'start_time') {
                        // Generate time options in 30-minute intervals
                        const timeOptions = [];
                        for (let hour = 0; hour < 24; hour++) {
                            for (let minute of [0, 30]) {
                                const time = new Date();
                                time.setHours(hour, minute);
                                timeOptions.push({
                                    name: time.toLocaleTimeString('en-US', { 
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    }),
                                    value: time.toLocaleTimeString('en-US', { 
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    })
                                });
                            }
                        }
                        
                        await interaction.respond(
                            timeOptions.filter(option => 
                                option.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                            ).slice(0, 25)
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error in interaction handler:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'There was an error processing your interaction.',
                        ephemeral: true
                    });
                }
            } catch (e) {
                console.error('Error sending error message:', e);
            }
        }
    }
}; 