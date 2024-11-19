const { PermissionsBitField } = require('discord.js');
const supabase = require('./supabase');

const ROLE_PERMISSIONS = {
    member: [],
    staff: [
        'ViewTickets',
        'ClaimTickets',
        'ManageEvents'
    ],
    manager: [
        'ViewTickets',
        'ClaimTickets',
        'ManageEvents',
        'ManagePayments',
        'ManageRefunds'
    ],
    admin: [
        'ViewTickets',
        'ClaimTickets',
        'ManageEvents',
        'ManagePayments',
        'ManageRefunds',
        'ManageRoles'
    ]
};

async function assignRole(userId, guildId, role, assignedBy) {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .upsert({
                user_id: userId,
                guild_id: guildId,
                role: role,
                assigned_by: assignedBy
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error assigning role:', error);
        throw error;
    }
}

async function getUserRole(userId, guildId) {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('guild_id', guildId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return 'member'; // Default role if not found
            }
            throw error;
        }

        return data.role;
    } catch (error) {
        console.error('Error getting user role:', error);
        throw error;
    }
}

async function hasPermission(userId, guildId, permission) {
    try {
        const role = await getUserRole(userId, guildId);
        const permissions = ROLE_PERMISSIONS[role] || [];
        return permissions.includes(permission);
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

async function removeRole(userId, guildId) {
    try {
        const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('guild_id', guildId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error removing role:', error);
        throw error;
    }
}

module.exports = {
    assignRole,
    getUserRole,
    hasPermission,
    removeRole,
    ROLE_PERMISSIONS
}; 