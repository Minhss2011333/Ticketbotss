// Standalone Discord Bot for Tradeblox Middleman Services
// This file contains everything needed to run the bot independently

const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');

// Simple in-memory storage for standalone deployment
class SimpleStorage {
  constructor() {
    this.tickets = new Map();
    this.ticketCounter = 40000;
  }

  async createTicket(ticketData) {
    const id = this.ticketCounter++;
    const ticket = {
      id,
      ticketNumber: id.toString(),
      ...ticketData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async getTicket(id) {
    return this.tickets.get(id);
  }

  async updateTicket(id, updates) {
    const ticket = this.tickets.get(id);
    if (ticket) {
      Object.assign(ticket, updates);
      this.tickets.set(id, ticket);
      return ticket;
    }
    return null;
  }

  async getAllTickets() {
    return Array.from(this.tickets.values());
  }

  async deleteTicket(id) {
    return this.tickets.delete(id);
  }
}

class TradebloxBot {
  constructor(token) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ]
    });
    this.token = token;
    this.storage = new SimpleStorage();
    this.ADMIN_ROLE_ID = '1365778314572333188';
    this.confirmations = new Map();
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`Bot ready! Logged in as ${this.client.user.tag}`);
      this.setupCommands();
    });

    this.client.on('interactionCreate', async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          await this.handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
          await this.handleButtonInteraction(interaction);
        } else if (interaction.isStringSelectMenu()) {
          await this.handleSelectMenuInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
          await this.handleModalSubmit(interaction);
        }
      } catch (error) {
        console.error('Error handling interaction:', error);
      }
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      
      if (message.content === '!apple') {
        await this.handleAppleTextCommand(message);
      } else if (message.content === '!deletec') {
        await this.handleDeleteChannelCommand(message);
      }
    });
  }

  async setupCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Create ticket request embed (admin only)'),
      
      new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('List all tickets'),
      
      new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Show specific ticket details')
        .addStringOption(option =>
          option.setName('number')
            .setDescription('Ticket number')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a ticket as middleman')
        .addStringOption(option =>
          option.setName('number')
            .setDescription('Ticket number')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('unclaim')
        .setDescription('Unclaim a ticket')
        .addStringOption(option =>
          option.setName('number')
            .setDescription('Ticket number')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close a ticket')
        .addStringOption(option =>
          option.setName('number')
            .setDescription('Ticket number')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('fee')
        .setDescription('Display middleman fee information'),
      
      new SlashCommandBuilder()
        .setName('tagmm')
        .setDescription('Explain what a middleman is (admin only)'),
      
      new SlashCommandBuilder()
        .setName('tcmds')
        .setDescription('Display list of all Tradeblox commands')
    ];

    try {
      console.log('Refreshing application (/) commands.');
      await this.client.application.commands.set(commands);
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('Error setting up commands:', error);
    }
  }

  hasAdminRole(interaction) {
    const member = interaction.member;
    return member && member.roles.cache.has(this.ADMIN_ROLE_ID);
  }

  async handleSlashCommand(interaction) {
    const { commandName } = interaction;

    switch (commandName) {
      case 'setup':
        if (!this.hasAdminRole(interaction)) {
          await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          return;
        }
        await this.handleSetupCommand(interaction);
        break;
      
      case 'tickets':
        await this.handleTicketsCommand(interaction);
        break;
      
      case 'ticket':
        await this.handleTicketCommand(interaction);
        break;
      
      case 'claim':
        await this.handleClaimCommand(interaction);
        break;
      
      case 'unclaim':
        await this.handleUnclaimCommand(interaction);
        break;
      
      case 'close':
        await this.handleCloseCommand(interaction);
        break;
      
      case 'fee':
        await this.handleFeeCommand(interaction);
        break;
      
      case 'tagmm':
        if (!this.hasAdminRole(interaction)) {
          await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          return;
        }
        await this.handleTagMMCommand(interaction);
        break;
      
      case 'tcmds':
        await this.handleTcmdsCommand(interaction);
        break;
    }
  }

  async handleSetupCommand(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Request a middleman')
      .setDescription(`**Middleman Service**

🔸 To request a middleman from Tradeblox | MM & Trading, select your deal value range from the dropdown below.

**How does middleman work?**
✕ Example: Trade is NFR Crow for Robux.
Seller gives NFR Crow to middleman
Buyer pays seller robux (After middleman confirms receiving pet)
Middleman gives buyer NFR Crow (After seller confirmed receiving robux)

**NOTES:**
1. You must both agree on the deal before using a middleman. Troll tickets will have consequences.

2. Specify what you're trading (e.g. FR Frost Dragon in Adopt me > $20 USD LTC). Don't just put "adopt me" in the embed.

**Trade Blox**`)
      .setColor(0xFF8C00)
      .setFooter({ text: 'Powered by ticketsbot.cloud' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('deal_value_select')
      .setPlaceholder('Select your deal value range to request a middleman...')
      .addOptions([
        {
          label: 'Deals up to $50',
          description: 'For trades valued up to $50',
          value: 'up_to_50',
          emoji: '💰'
        },
        {
          label: 'Deals up to $150',
          description: 'For trades valued up to $150',
          value: 'up_to_150',
          emoji: '💎'
        },
        {
          label: 'Deals up to $350',
          description: 'For trades valued up to $350',
          value: 'up_to_350',
          emoji: '🏆'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ embeds: [embed], components: [row] });
  }

  async handleTicketsCommand(interaction) {
    const tickets = await this.storage.getAllTickets();
    
    if (tickets.length === 0) {
      await interaction.reply({ content: 'No tickets found.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 All Tickets')
      .setColor(0x0099FF);

    const ticketList = tickets.slice(0, 10).map(ticket => {
      const statusEmoji = ticket.status === 'pending' ? '🟡' : ticket.status === 'claimed' ? '🔵' : '🔴';
      return `${statusEmoji} **#${ticket.ticketNumber}** - ${ticket.status} ${ticket.claimedByName ? `(${ticket.claimedByName})` : ''}`;
    }).join('\n');

    embed.setDescription(ticketList);
    
    if (tickets.length > 10) {
      embed.setFooter({ text: `Showing 10 of ${tickets.length} tickets` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  async handleTicketCommand(interaction) {
    const ticketNumber = interaction.options.getString('number');
    const ticket = await this.storage.getTicket(parseInt(ticketNumber));

    if (!ticket) {
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, ephemeral: true });
      return;
    }

    const embed = this.createTicketEmbed(ticket);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  async handleClaimCommand(interaction) {
    const ticketNumber = interaction.options.getString('number');
    const ticket = await this.storage.getTicket(parseInt(ticketNumber));

    if (!ticket) {
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, ephemeral: true });
      return;
    }

    if (ticket.status !== 'pending') {
      await interaction.reply({ content: `Ticket ${ticketNumber} is not available for claiming.`, ephemeral: true });
      return;
    }

    const updatedTicket = await this.storage.updateTicket(ticket.id, {
      status: 'claimed',
      claimedBy: interaction.user.id,
      claimedByName: interaction.user.displayName || interaction.user.username
    });

    if (updatedTicket) {
      const embed = this.createTicketEmbed(updatedTicket);
      await interaction.reply({ 
        content: `✅ You have claimed ticket ${ticketNumber}!`, 
        embeds: [embed] 
      });
    } else {
      await interaction.reply({ content: 'Failed to claim ticket.', ephemeral: true });
    }
  }

  async handleUnclaimCommand(interaction) {
    const ticketNumber = interaction.options.getString('number');
    const ticket = await this.storage.getTicket(parseInt(ticketNumber));

    if (!ticket) {
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, ephemeral: true });
      return;
    }

    if (ticket.status !== 'claimed') {
      await interaction.reply({ content: `Ticket ${ticketNumber} is not currently claimed.`, ephemeral: true });
      return;
    }

    if (ticket.claimedBy !== interaction.user.id) {
      await interaction.reply({ content: 'You can only unclaim tickets that you have claimed.', ephemeral: true });
      return;
    }

    const updatedTicket = await this.storage.updateTicket(ticket.id, {
      status: 'pending',
      claimedBy: undefined,
      claimedByName: undefined
    });

    if (updatedTicket) {
      const embed = this.createTicketEmbed(updatedTicket);
      await interaction.reply({ 
        content: `✅ You have unclaimed ticket ${ticketNumber}! It's now available for other middlemen.`, 
        embeds: [embed] 
      });
    } else {
      await interaction.reply({ content: 'Failed to unclaim ticket.', ephemeral: true });
    }
  }

  async handleCloseCommand(interaction) {
    const ticketNumber = interaction.options.getString('number');
    const ticket = await this.storage.getTicket(parseInt(ticketNumber));

    if (!ticket) {
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, ephemeral: true });
      return;
    }

    if (ticket.status === 'closed') {
      await interaction.reply({ content: `Ticket ${ticketNumber} is already closed.`, ephemeral: true });
      return;
    }

    const updatedTicket = await this.storage.updateTicket(ticket.id, {
      status: 'closed'
    });

    if (updatedTicket) {
      const embed = this.createTicketEmbed(updatedTicket);
      await interaction.reply({ content: `🔒 Ticket ${ticketNumber} has been closed.`, embeds: [embed] });
    } else {
      await interaction.reply({ content: 'Failed to close ticket.', ephemeral: true });
    }
  }

  async handleFeeCommand(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💰 Middleman Fee Information')
      .setDescription('Click the buttons below to see our competitive middleman fees:')
      .setColor(0xFFA500);

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('fee_robux')
          .setLabel('Robux Fees')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💎'),
        new ButtonBuilder()
          .setCustomId('fee_crypto')
          .setLabel('Crypto Fees')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('₿'),
        new ButtonBuilder()
          .setCustomId('fee_paypal')
          .setLabel('PayPal Fees')
          .setStyle(ButtonStyle.Success)
          .setEmoji('💳')
      );

    await interaction.reply({ embeds: [embed], components: [buttons] });
  }

  async handleTcmdsCommand(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📋 Tradeblox Commands List')
      .setDescription('Here are all available commands organized by category:')
      .setColor(0x0099FF)
      .addFields(
        {
          name: '🎫 Ticket Commands',
          value: '`/tickets` - List all tickets\n`/ticket <number>` - Show ticket details\n`/claim <number>` - Claim a ticket\n`/unclaim <number>` - Unclaim a ticket\n`/close <number>` - Close a ticket',
          inline: false
        },
        {
          name: '⚙️ Admin Commands',
          value: '`/setup` - Create ticket request embed\n`/tagmm` - Explain middleman services\n`!deletec` - Delete current channel',
          inline: false
        },
        {
          name: '💰 Information Commands',
          value: '`/fee` - Display middleman fees\n`/tcmds` - Show this command list',
          inline: false
        },
        {
          name: '🍎 Special Commands',
          value: '`!apple` - Join development team',
          inline: false
        }
      )
      .setFooter({ text: 'Admin commands require special permissions' });

    await interaction.reply({ embeds: [embed] });
  }

  async handleTagMMCommand(interaction) {
    const mmEmbed = new EmbedBuilder()
      .setTitle('What is Middleman?')
      .setDescription('A middleman (MM) is a trusted person with many vouches who helps transactions go smoothly without scams.')
      .setColor(0xFFA500);

    const exampleEmbed = new EmbedBuilder()
      .setTitle('Here is an example:')
      .setDescription('Krisha has 8,000 Robux, and you want to give him an Adopt Me item. You both agree on the trade, so the middleman will take the Adopt Me item, and krisha will send the Robux to the person who had the item and then the middleman will give the item to krisha!')
      .setColor(0xFFD700);

    const footerEmbed = new EmbedBuilder()
      .setDescription('Click below the option')
      .setColor(0xFFA500);

    const understandButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('understand_yes')
          .setLabel('I understand!')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('understand_no')
          .setLabel('I don\'t understand')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({
      embeds: [mmEmbed, exampleEmbed, footerEmbed],
      components: [understandButtons]
    });
  }

  async handleButtonInteraction(interaction) {
    try {
      if (interaction.customId.startsWith('claim_')) {
        const ticketId = parseInt(interaction.customId.replace('claim_', ''));
        const ticket = await this.storage.getTicket(ticketId);

        if (!ticket) {
          await interaction.reply({ content: 'Ticket not found.', flags: 64 });
          return;
        }

        if (ticket.status !== 'pending') {
          await interaction.reply({ content: 'This ticket is not available for claiming.', flags: 64 });
          return;
        }

        const updatedTicket = await this.storage.updateTicket(ticketId, {
          status: 'claimed',
          claimedBy: interaction.user.id,
          claimedByName: interaction.user.displayName || interaction.user.username
        });

        if (updatedTicket) {
          try {
            const embed = this.createTicketEmbed(updatedTicket);
            await interaction.update({ embeds: [embed], components: [this.createTicketActionRow(updatedTicket)] });
          } catch (error) {
            console.error('Error updating interaction:', error);
            await interaction.followUp({ content: `✅ Ticket successfully claimed by ${interaction.user.displayName || interaction.user.username}!`, flags: 64 });
          }
        } else {
          await interaction.reply({ content: 'Failed to claim ticket. Please try again.', flags: 64 });
        }
      } else if (interaction.customId.startsWith('understand_')) {
        const understands = interaction.customId === 'understand_yes';
        const message = understands 
          ? `${interaction.user.displayName || interaction.user.username} understands how middleman services work! 👍`
          : `${interaction.user.displayName || interaction.user.username} doesn't understand yet. Please feel free to ask questions in the channel!`;
        
        await interaction.reply({ content: message, ephemeral: false });
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: 'An error occurred while processing your request. Please try again.', 
            flags: 64 
          });
        }
      } catch (followUpError) {
        console.error('Error sending error message:', followUpError);
      }
    }
  }

  async handleSelectMenuInteraction(interaction) {
    if (interaction.customId === 'deal_value_select') {
      const selectedValue = interaction.values[0];
      let dealValueLabel = '';
      
      switch (selectedValue) {
        case 'up_to_50':
          dealValueLabel = 'Deals up to $50';
          break;
        case 'up_to_150':
          dealValueLabel = 'Deals up to $150';
          break;
        case 'up_to_350':
          dealValueLabel = 'Deals up to $350';
          break;
      }

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

      const firstActionRow = new ActionRowBuilder().addComponents(otherTraderInput);
      const secondActionRow = new ActionRowBuilder().addComponents(givingInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(receivingInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
      await interaction.showModal(modal);
    }
  }

  async handleModalSubmit(interaction) {
    if (interaction.customId.startsWith('ticket_modal_')) {
      const dealValue = interaction.customId.replace('ticket_modal_', '');
      const otherTrader = interaction.fields.getTextInputValue('otherTrader');
      const giving = interaction.fields.getTextInputValue('giving');
      const receiving = interaction.fields.getTextInputValue('receiving');

      const ticket = await this.storage.createTicket({
        creatorId: interaction.user.id,
        creatorName: interaction.user.displayName || interaction.user.username,
        otherUserId: otherTrader,
        deal: `${giving} ↔ ${receiving}`,
        dealValue: dealValue,
        giving: giving,
        receiving: receiving
      });

      const embed = this.createTicketDisplayEmbed(otherTrader, giving, receiving, dealValue);
      const actionRow = this.createTicketActionRow(ticket);

      await interaction.reply({
        content: `🎫 **Ticket #${ticket.ticketNumber}** created! <@&${this.ADMIN_ROLE_ID}>`,
        embeds: [embed],
        components: [actionRow]
      });
    }
  }

  async handleAppleTextCommand(message) {
    const roleId = '1365778320951738599';
    const member = message.member;
    
    if (!member) {
      await message.reply('Unable to process command - member not found.');
      return;
    }

    if (member.roles.cache.has(roleId)) {
      await message.reply(`${message.author.username} already has the Apple role!`);
      return;
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle(`# Hello ${message.author.username}`)
      .setDescription('Are you willing to join our development team?')
      .setColor(0x00FF00)
      .setTimestamp();

    const confirmButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`apple_yes_${message.author.id}`)
          .setLabel('Yes')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`apple_no_${message.author.id}`)
          .setLabel('No')
          .setStyle(ButtonStyle.Danger)
      );

    await message.reply({
      embeds: [confirmEmbed],
      components: [confirmButtons]
    });
  }

  async handleDeleteChannelCommand(message) {
    const member = message.member;
    if (!member || !member.roles.cache.has(this.ADMIN_ROLE_ID)) {
      await message.reply('You do not have permission to delete channels.');
      return;
    }

    const channel = message.channel;
    if (!channel || !channel.delete) {
      await message.reply('This command can only be used in deletable channels.');
      return;
    }

    try {
      await channel.delete();
    } catch (error) {
      console.error('Error deleting channel:', error);
      await message.reply('Failed to delete channel.');
    }
  }

  createTicketEmbed(ticket) {
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

  createTicketDisplayEmbed(otherTrader, giving, receiving, dealValue) {
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

  createTicketActionRow(ticket) {
    const row = new ActionRowBuilder();

    if (ticket.status === 'pending') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${ticket.id}`)
          .setLabel('Claim')
          .setEmoji('🛡️')
          .setStyle(ButtonStyle.Success)
      );
    }

    if (ticket.status === 'claimed') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`unclaim_${ticket.id}`)
          .setLabel('Unclaim')
          .setEmoji('🔓')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${ticket.id}`)
        .setLabel('Close')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    return row;
  }

  async start() {
    try {
      await this.client.login(this.token);
    } catch (error) {
      console.error('Failed to start bot:', error);
    }
  }

  async stop() {
    await this.client.destroy();
  }
}

// Start the bot
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}

const bot = new TradebloxBot(token);
bot.start();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down bot...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down bot...');
  await bot.stop();
  process.exit(0);
});