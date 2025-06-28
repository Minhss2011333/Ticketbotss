const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

// Simple storage for tickets
const tickets = new Map();
let ticketCounter = 40000;
const ADMIN_ROLE_ID = '1365778314572333188';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.once('ready', async () => {
  console.log(`Bot ready! Logged in as ${client.user.tag}`);
  
  const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Create ticket request embed (admin only)'),
    new SlashCommandBuilder().setName('tickets').setDescription('List all tickets'),
    new SlashCommandBuilder().setName('ticket').setDescription('Show ticket details').addStringOption(option => option.setName('number').setDescription('Ticket number').setRequired(true)),
    new SlashCommandBuilder().setName('claim').setDescription('Claim a ticket').addStringOption(option => option.setName('number').setDescription('Ticket number').setRequired(true)),
    new SlashCommandBuilder().setName('unclaim').setDescription('Unclaim a ticket').addStringOption(option => option.setName('number').setDescription('Ticket number').setRequired(true)),
    new SlashCommandBuilder().setName('close').setDescription('Close a ticket').addStringOption(option => option.setName('number').setDescription('Ticket number').setRequired(true)),
    new SlashCommandBuilder().setName('fee').setDescription('Display middleman fee information'),
    new SlashCommandBuilder().setName('tagmm').setDescription('Explain what a middleman is (admin only)'),
    new SlashCommandBuilder().setName('tcmds').setDescription('Display list of all Tradeblox commands')
  ];

  try {
    await client.application.commands.set(commands);
    console.log('Commands registered successfully.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      const hasAdmin = interaction.member?.roles.cache.has(ADMIN_ROLE_ID);

      switch (commandName) {
        case 'setup':
          if (!hasAdmin) return interaction.reply({ content: 'Admin only command.', ephemeral: true });
          
          const embed = new EmbedBuilder()
            .setTitle('Request a middleman')
            .setDescription('**Middleman Service**\n\n🔸 To request a middleman from Tradeblox | MM & Trading, select your deal value range from the dropdown below.\n\n**How does middleman work?**\n✕ Example: Trade is NFR Crow for Robux.\nSeller gives NFR Crow to middleman\nBuyer pays seller robux (After middleman confirms receiving pet)\nMiddleman gives buyer NFR Crow (After seller confirmed receiving robux)\n\n**NOTES:**\n1. You must both agree on the deal before using a middleman. Troll tickets will have consequences.\n\n2. Specify what you\'re trading (e.g. FR Frost Dragon in Adopt me > $20 USD LTC). Don\'t just put "adopt me" in the embed.\n\n**Trade Blox**')
            .setColor(0xFF8C00)
            .setFooter({ text: 'Powered by ticketsbot.cloud' });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('deal_value_select')
            .setPlaceholder('Select your deal value range to request a middleman...')
            .addOptions([
              { label: 'Deals up to $50', description: 'For trades valued up to $50', value: 'up_to_50', emoji: '💰' },
              { label: 'Deals up to $150', description: 'For trades valued up to $150', value: 'up_to_150', emoji: '💎' },
              { label: 'Deals up to $350', description: 'For trades valued up to $350', value: 'up_to_350', emoji: '🏆' }
            ]);

          await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
          break;

        case 'tickets':
          const allTickets = Array.from(tickets.values());
          if (allTickets.length === 0) return interaction.reply({ content: 'No tickets found.', ephemeral: true });
          
          const ticketEmbed = new EmbedBuilder()
            .setTitle('📋 All Tickets')
            .setDescription(allTickets.slice(0, 10).map(t => {
              const statusEmoji = t.status === 'pending' ? '🟡' : t.status === 'claimed' ? '🔵' : '🔴';
              return `${statusEmoji} **#${t.ticketNumber}** - ${t.status} ${t.claimedByName ? `(${t.claimedByName})` : ''}`;
            }).join('\n'))
            .setColor(0x0099FF);
          
          await interaction.reply({ embeds: [ticketEmbed], ephemeral: true });
          break;

        case 'ticket':
          const ticketNum = interaction.options.getString('number');
          const ticket = tickets.get(parseInt(ticketNum));
          if (!ticket) return interaction.reply({ content: `Ticket ${ticketNum} not found.`, ephemeral: true });
          
          const detailEmbed = createTicketEmbed(ticket);
          await interaction.reply({ embeds: [detailEmbed], ephemeral: true });
          break;

        case 'claim':
          const claimNum = interaction.options.getString('number');
          const claimTicket = tickets.get(parseInt(claimNum));
          if (!claimTicket) return interaction.reply({ content: `Ticket ${claimNum} not found.`, ephemeral: true });
          if (claimTicket.status !== 'pending') return interaction.reply({ content: `Ticket ${claimNum} is not available for claiming.`, ephemeral: true });
          
          claimTicket.status = 'claimed';
          claimTicket.claimedBy = interaction.user.id;
          claimTicket.claimedByName = interaction.user.displayName || interaction.user.username;
          
          const claimEmbed = createTicketEmbed(claimTicket);
          await interaction.reply({ content: `✅ You have claimed ticket ${claimNum}!`, embeds: [claimEmbed] });
          break;

        case 'unclaim':
          const unclaimNum = interaction.options.getString('number');
          const unclaimTicket = tickets.get(parseInt(unclaimNum));
          if (!unclaimTicket) return interaction.reply({ content: `Ticket ${unclaimNum} not found.`, ephemeral: true });
          if (unclaimTicket.status !== 'claimed') return interaction.reply({ content: `Ticket ${unclaimNum} is not currently claimed.`, ephemeral: true });
          if (unclaimTicket.claimedBy !== interaction.user.id) return interaction.reply({ content: 'You can only unclaim tickets that you have claimed.', ephemeral: true });
          
          unclaimTicket.status = 'pending';
          unclaimTicket.claimedBy = undefined;
          unclaimTicket.claimedByName = undefined;
          
          const unclaimEmbed = createTicketEmbed(unclaimTicket);
          await interaction.reply({ content: `✅ You have unclaimed ticket ${unclaimNum}! It's now available for other middlemen.`, embeds: [unclaimEmbed] });
          break;

        case 'close':
          const closeNum = interaction.options.getString('number');
          const closeTicket = tickets.get(parseInt(closeNum));
          if (!closeTicket) return interaction.reply({ content: `Ticket ${closeNum} not found.`, ephemeral: true });
          if (closeTicket.status === 'closed') return interaction.reply({ content: `Ticket ${closeNum} is already closed.`, ephemeral: true });
          
          closeTicket.status = 'closed';
          const closeEmbed = createTicketEmbed(closeTicket);
          await interaction.reply({ content: `🔒 Ticket ${closeNum} has been closed.`, embeds: [closeEmbed] });
          break;

        case 'fee':
          const feeEmbed = new EmbedBuilder()
            .setTitle('💰 Middleman Fee Information')
            .setDescription('Click the buttons below to see our competitive middleman fees:')
            .setColor(0xFFA500);
          
          const feeButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fee_robux').setLabel('Robux Fees').setStyle(ButtonStyle.Primary).setEmoji('💎'),
            new ButtonBuilder().setCustomId('fee_crypto').setLabel('Crypto Fees').setStyle(ButtonStyle.Secondary).setEmoji('₿'),
            new ButtonBuilder().setCustomId('fee_paypal').setLabel('PayPal Fees').setStyle(ButtonStyle.Success).setEmoji('💳')
          );
          
          await interaction.reply({ embeds: [feeEmbed], components: [feeButtons] });
          break;

        case 'tagmm':
          if (!hasAdmin) return interaction.reply({ content: 'Admin only command.', ephemeral: true });
          
          const mmEmbed = new EmbedBuilder().setTitle('What is Middleman?').setDescription('A middleman (MM) is a trusted person with many vouches who helps transactions go smoothly without scams.').setColor(0xFFA500);
          const exampleEmbed = new EmbedBuilder().setTitle('Here is an example:').setDescription('Krisha has 8,000 Robux, and you want to give him an Adopt Me item. You both agree on the trade, so the middleman will take the Adopt Me item, and krisha will send the Robux to the person who had the item and then the middleman will give the item to krisha!').setColor(0xFFD700);
          const footerEmbed = new EmbedBuilder().setDescription('Click below the option').setColor(0xFFA500);
          
          const understandButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('understand_yes').setLabel('I understand!').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('understand_no').setLabel('I don\'t understand').setStyle(ButtonStyle.Secondary)
          );
          
          await interaction.reply({ embeds: [mmEmbed, exampleEmbed, footerEmbed], components: [understandButtons] });
          break;

        case 'tcmds':
          const cmdEmbed = new EmbedBuilder()
            .setTitle('📋 Tradeblox Commands List')
            .setDescription('Here are all available commands organized by category:')
            .setColor(0x0099FF)
            .addFields(
              { name: '🎫 Ticket Commands', value: '`/tickets` - List all tickets\n`/ticket <number>` - Show ticket details\n`/claim <number>` - Claim a ticket\n`/unclaim <number>` - Unclaim a ticket\n`/close <number>` - Close a ticket', inline: false },
              { name: '⚙️ Admin Commands', value: '`/setup` - Create ticket request embed\n`/tagmm` - Explain middleman services\n`!deletec` - Delete current channel', inline: false },
              { name: '💰 Information Commands', value: '`/fee` - Display middleman fees\n`/tcmds` - Show this command list', inline: false },
              { name: '🍎 Special Commands', value: '`!apple` - Join development team', inline: false }
            )
            .setFooter({ text: 'Admin commands require special permissions' });
          
          await interaction.reply({ embeds: [cmdEmbed] });
          break;
      }
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('claim_')) {
        const ticketId = parseInt(interaction.customId.replace('claim_', ''));
        const ticket = tickets.get(ticketId);
        
        if (!ticket) return interaction.reply({ content: 'Ticket not found.', flags: 64 });
        if (ticket.status !== 'pending') return interaction.reply({ content: 'This ticket is not available for claiming.', flags: 64 });
        
        ticket.status = 'claimed';
        ticket.claimedBy = interaction.user.id;
        ticket.claimedByName = interaction.user.displayName || interaction.user.username;
        
        const embed = createTicketEmbed(ticket);
        await interaction.update({ embeds: [embed], components: [createTicketActionRow(ticket)] });
      } else if (interaction.customId.startsWith('unclaim_')) {
        const ticketId = parseInt(interaction.customId.replace('unclaim_', ''));
        const ticket = tickets.get(ticketId);
        
        if (!ticket) return interaction.reply({ content: 'Ticket not found.', flags: 64 });
        if (ticket.status !== 'claimed') return interaction.reply({ content: 'This ticket is not currently claimed.', flags: 64 });
        if (ticket.claimedBy !== interaction.user.id) return interaction.reply({ content: 'You can only unclaim tickets that you have claimed.', flags: 64 });
        
        ticket.status = 'pending';
        ticket.claimedBy = undefined;
        ticket.claimedByName = undefined;
        
        const embed = createTicketEmbed(ticket);
        await interaction.update({ embeds: [embed], components: [createTicketActionRow(ticket)] });
      } else if (interaction.customId.startsWith('close_')) {
        const ticketId = parseInt(interaction.customId.replace('close_', ''));
        const ticket = tickets.get(ticketId);
        
        if (!ticket) return interaction.reply({ content: 'Ticket not found.', flags: 64 });
        
        ticket.status = 'closed';
        const embed = createTicketEmbed(ticket);
        await interaction.reply({ content: `🔒 Ticket #${ticket.ticketNumber} has been closed.`, embeds: [embed] });
      } else if (interaction.customId === 'understand_yes') {
        await interaction.reply({ content: `${interaction.user.displayName || interaction.user.username} understands how middleman services work! 👍`, ephemeral: false });
      } else if (interaction.customId === 'understand_no') {
        await interaction.reply({ content: `${interaction.user.displayName || interaction.user.username} doesn't understand yet. Please feel free to ask questions in the channel!`, ephemeral: false });
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'deal_value_select') {
        const selectedValue = interaction.values[0];
        let dealValueLabel = selectedValue.replace('_', ' ').replace('up to', 'Up to');
        
        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${selectedValue}`)
          .setTitle(`Middleman Request - ${dealValueLabel}`);

        const otherTraderInput = new TextInputBuilder()
          .setCustomId('otherTrader')
          .setLabel('What is the other trader\'s username?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter username...')
          .setRequired(true)
          .setMaxLength(100);

        const givingInput = new TextInputBuilder()
          .setCustomId('giving')
          .setLabel('What are you giving?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g., FR Frost Dragon in Adopt Me')
          .setRequired(true)
          .setMaxLength(200);

        const receivingInput = new TextInputBuilder()
          .setCustomId('receiving')
          .setLabel('What is the other trader giving?')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g., $20 USD LTC')
          .setRequired(true)
          .setMaxLength(200);

        modal.addComponents(
          new ActionRowBuilder().addComponents(otherTraderInput),
          new ActionRowBuilder().addComponents(givingInput),
          new ActionRowBuilder().addComponents(receivingInput)
        );

        await interaction.showModal(modal);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_modal_')) {
        const dealValue = interaction.customId.replace('ticket_modal_', '');
        const otherTrader = interaction.fields.getTextInputValue('otherTrader');
        const giving = interaction.fields.getTextInputValue('giving');
        const receiving = interaction.fields.getTextInputValue('receiving');

        const ticket = {
          id: ticketCounter,
          ticketNumber: ticketCounter.toString(),
          creatorId: interaction.user.id,
          creatorName: interaction.user.displayName || interaction.user.username,
          otherUserId: otherTrader,
          deal: `${giving} ↔ ${receiving}`,
          dealValue: dealValue,
          giving: giving,
          receiving: receiving,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        tickets.set(ticketCounter, ticket);
        ticketCounter++;

        const embed = createTicketDisplayEmbed(otherTrader, giving, receiving, dealValue);
        const actionRow = createTicketActionRow(ticket);

        await interaction.reply({
          content: `🎫 **Ticket #${ticket.ticketNumber}** created! <@&${ADMIN_ROLE_ID}>`,
          embeds: [embed],
          components: [actionRow]
        });
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred. Please try again.', flags: 64 });
      }
    } catch (e) {
      console.error('Error sending error message:', e);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.content === '!deletec') {
    const member = message.member;
    if (!member || !member.roles.cache.has(ADMIN_ROLE_ID)) {
      return message.reply('You do not have permission to delete channels.');
    }
    
    try {
      await message.channel.delete();
    } catch (error) {
      console.error('Error deleting channel:', error);
      message.reply('Failed to delete channel.');
    }
  }
});

function createTicketEmbed(ticket) {
  const statusColor = ticket.status === 'pending' ? 0xFFFF00 : ticket.status === 'claimed' ? 0x0099FF : 0xFF0000;
  const statusEmoji = ticket.status === 'pending' ? '🟡' : ticket.status === 'claimed' ? '🔵' : '🔴';

  return new EmbedBuilder()
    .setTitle(`${statusEmoji} Ticket #${ticket.ticketNumber}`)
    .setDescription(`**Deal:** ${ticket.deal}`)
    .addFields(
      { name: 'Creator', value: `<@${ticket.creatorId}>`, inline: true },
      { name: 'Other Trader', value: ticket.otherUserId, inline: true },
      { name: 'Status', value: ticket.status.toUpperCase(), inline: true }
    )
    .setColor(statusColor)
    .setTimestamp(new Date(ticket.createdAt));
}

function createTicketDisplayEmbed(otherTrader, giving, receiving, dealValue) {
  return new EmbedBuilder()
    .setTitle('🎫 New Middleman Request')
    .setDescription(`**Deal Value:** ${dealValue.replace('_', ' ').replace('up to', 'Up to')}`)
    .addFields(
      { name: '👤 Other Trader', value: otherTrader, inline: true },
      { name: '📤 Giving', value: giving, inline: true },
      { name: '📥 Receiving', value: receiving, inline: true }
    )
    .setColor(0xFF8C00)
    .setTimestamp();
}

function createTicketActionRow(ticket) {
  const row = new ActionRowBuilder();

  if (ticket.status === 'pending') {
    row.addComponents(new ButtonBuilder().setCustomId(`claim_${ticket.id}`).setLabel('Claim').setEmoji('🛡️').setStyle(ButtonStyle.Success));
  }

  if (ticket.status === 'claimed') {
    row.addComponents(new ButtonBuilder().setCustomId(`unclaim_${ticket.id}`).setLabel('Unclaim').setEmoji('🔓').setStyle(ButtonStyle.Secondary));
  }

  row.addComponents(new ButtonBuilder().setCustomId(`close_${ticket.id}`).setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger));

  return row;
}

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}

client.login(token);