const { SlashCommandBuilder } = require('discord.js');
const { assignRole, ROLE_PERMISSIONS } = require('../../utils/roleManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assign-role')
        .setDescription('Assign a role to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to assign the role to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('role')
                .setDescription('The role to assign')
                .addChoices(
                    { name: 'Member', value: 'member' },
                    { name: 'Staff', value: 'staff' },
                    { name: 'Manager', value: 'manager' },
                    { name: 'Admin', value: 'admin' }
                )
                .setRequired(true))
        .setDefaultMemberPermissions(0x0000000000000008), // Administrator permission

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getString('role');

            await assignRole(
                user.id,
                interaction.guild.id,
                role,
                interaction.user.id
            );

            const permissions = ROLE_PERMISSIONS[role].join(', ') || 'None';

            await interaction.reply({
                content: `Successfully assigned ${role} role to ${user}.\nPermissions: ${permissions}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error executing assign-role command:', error);
            await interaction.reply({
                content: 'There was an error assigning the role.',
                ephemeral: true
            });
        }
    }
}; 