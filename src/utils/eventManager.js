const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const supabase = require('./supabase');

async function createEvent(interaction, title, description, startTime, endTime, maxParticipants) {
    try {
        // Create event in database
        const { data: event, error } = await supabase
            .from('events')
            .insert([{
                title,
                description,
                start_time: startTime,
                end_time: endTime,
                created_by: interaction.user.id,
                max_participants: maxParticipants,
                channel_id: interaction.channel.id
            }])
            .select()
            .single();

        if (error) throw error;

        // Create event embed
        const embed = createEventEmbed(event);
        const row = createEventButtons(event.id);

        return { embed, row };
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
}

function createEventEmbed(event, participants = []) {
    const embed = new EmbedBuilder()
        .setTitle(event.title)
        .setDescription(event.description)
        .addFields(
            { 
                name: 'Start Time', 
                value: new Date(event.start_time).toLocaleString(), 
                inline: true 
            },
            { 
                name: 'End Time', 
                value: event.end_time ? new Date(event.end_time).toLocaleString() : 'Not specified', 
                inline: true 
            },
            {
                name: 'Participants',
                value: participants.length > 0 
                    ? `${participants.length}${event.max_participants ? `/${event.max_participants}` : ''}`
                    : 'No participants yet',
                inline: true
            }
        )
        .setColor('#00FF00')
        .setTimestamp();

    if (participants.length > 0) {
        embed.addFields({
            name: 'RSVP List',
            value: participants.map(p => `<@${p.user_id}> - ${p.status}`).join('\n') || 'No participants yet'
        });
    }

    return embed;
}

function createEventButtons(eventId) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`event_join_${eventId}`)
                .setLabel('Join')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`event_maybe_${eventId}`)
                .setLabel('Maybe')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`event_decline_${eventId}`)
                .setLabel('Decline')
                .setStyle(ButtonStyle.Danger)
        );
}

async function updateEventParticipant(eventId, userId, status) {
    try {
        // Check if user already has an RSVP
        const { data: existing, error: checkError } = await supabase
            .from('event_participants')
            .select()
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
            // Update existing RSVP
            const { data, error } = await supabase
                .from('event_participants')
                .update({ status })
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Create new RSVP
            const { data, error } = await supabase
                .from('event_participants')
                .insert([{
                    event_id: eventId,
                    user_id: userId,
                    status
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Error updating event participant:', error);
        throw error;
    }
}

async function getEventParticipants(eventId) {
    try {
        const { data, error } = await supabase
            .from('event_participants')
            .select()
            .eq('event_id', eventId);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting event participants:', error);
        throw error;
    }
}

async function getEvent(eventId) {
    try {
        const { data, error } = await supabase
            .from('events')
            .select()
            .eq('id', eventId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting event:', error);
        throw error;
    }
}

module.exports = {
    createEvent,
    updateEventParticipant,
    getEventParticipants,
    getEvent,
    createEventEmbed,
    createEventButtons
}; 