const supabase = require('./supabase');

async function checkPermission(interaction, requiredRole) {
    try {
        // Get configured roles from database
        const { data: configs } = await supabase
            .from('config')
            .select('key, value')
            .in('key', ['staff_role', 'claim_role'])
            .eq('guild_id', interaction.guildId);

        if (!configs) return false;

        // Create a map of role configurations
        const roleConfigs = configs.reduce((acc, config) => {
            try {
                acc[config.key] = JSON.parse(config.value);
            } catch (e) {
                acc[config.key] = [config.value]; // Convert old single-role format
            }
            return acc;
        }, {});

        // Get member's roles
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const memberRoles = member.roles.cache;

        // Check if member has administrator permission
        if (member.permissions.has('Administrator')) return true;

        // Check for specific role requirements
        switch (requiredRole) {
            case 'staff':
                return memberRoles.hasAny(...roleConfigs.staff_role);
            case 'claim':
                return memberRoles.hasAny(...roleConfigs.claim_role) || memberRoles.hasAny(...roleConfigs.staff_role);
            default:
                return false;
        }
    } catch (error) {
        console.error('Error checking permissions:', error);
        return false;
    }
}

module.exports = {
    checkPermission
}; 