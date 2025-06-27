import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events, ComponentType, ChannelType, StringSelectMenuBuilder, GuildChannel } from 'discord.js';
import { storage } from './storage.js';
import { insertTicketSchema, Ticket } from '../shared/schema.js';
import { z } from 'zod';

export class TradebloxBot {
  public client: Client;
  private token: string;
  private readonly ADMIN_ROLE_ID = '1365778314572333188';

  constructor(token: string) {
    this.token = token;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ]
    });

    this.setupEventHandlers();
    this.setupCommands();
  }

  private hasAdminRole(interaction: any): boolean {
    if (!interaction.member || !interaction.member.roles) return false;
    return interaction.member.roles.cache.has(this.ADMIN_ROLE_ID);
  }

  private setupEventHandlers() {
    this.client.once(Events.ClientReady, (readyClient) => {
      console.log(`Bot ready! Logged in as ${readyClient.user.tag}`);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButtonInteraction(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await this.handleSelectMenuInteraction(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModalSubmit(interaction);
      }
    });

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;
      
      if (message.content === '!deletec') {
        await this.handleDeleteChannelCommand(message);
      }
    });
  }

  private async setupCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('View all tickets in the system'),
      
      new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('View a specific ticket')
        .addStringOption(option =>
          option.setName('number')
            .setDescription('Ticket number (e.g., TKT-001)')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a ticket as a middleman')
        .addStringOption(option =>
          option.setName('number')
            .setDescription('Ticket number to claim')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close a ticket')
        .addStringOption(option =>
          option.setName('number')
            .setDescription('Ticket number to close')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup the ticket creation embed (Admin only)'),
      
      new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add another party to this ticket')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to add to the ticket')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('finish')
        .setDescription('Mark ticket as finished (Middleman only)')
        .addStringOption(option =>
          option.setName('number')
            .setDescription('Ticket number to finish')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('fee')
        .setDescription('Display middleman fee options'),
      
      new SlashCommandBuilder()
        .setName('tagmm')
        .setDescription('Explain what a middleman is')
    ];

    this.client.once(Events.ClientReady, async () => {
      try {
        console.log('Refreshing application (/) commands.');
        await this.client.application?.commands.set(commands);
        console.log('Successfully reloaded application (/) commands.');
      } catch (error) {
        console.error('Error refreshing commands:', error);
      }
    });
  }

  private async handleSlashCommand(interaction: any) {
    const { commandName } = interaction;

    try {
      switch (commandName) {
        case 'tickets':
          await this.handleTicketsCommand(interaction);
          break;
        case 'ticket':
          await this.handleTicketCommand(interaction);
          break;
        case 'claim':
          await this.handleClaimCommand(interaction);
          break;
        case 'close':
          await this.handleCloseCommand(interaction);
          break;
        case 'setup':
          if (!this.hasAdminRole(interaction)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
            return;
          }
          await this.handleSetupCommand(interaction);
          break;
        case 'add':
          if (!this.hasAdminRole(interaction)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
            return;
          }
          await this.handleAddCommand(interaction);
          break;
        case 'finish':
          if (!this.hasAdminRole(interaction)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
            return;
          }
          await this.handleFinishCommand(interaction);
          break;
        case 'fee':
          await this.handleFeeCommand(interaction);
          break;
        case 'tagmm':
          if (!this.hasAdminRole(interaction)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
            return;
          }
          await this.handleTagMMCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command!', flags: 64 });
      }
    } catch (error) {
      console.error('Error handling slash command:', error);
      await interaction.reply({ content: 'An error occurred while processing your command.', flags: 64 });
    }
  }

  private async handleTicketsCommand(interaction: any) {
    const tickets = await storage.getAllTickets();
    
    const embed = new EmbedBuilder()
      .setTitle('📋 All Tickets')
      .setColor(0xFFD700)
      .setTimestamp();

    if (tickets.length === 0) {
      embed.setDescription('No tickets found.');
    } else {
      const ticketList = tickets.slice(0, 10).map(ticket => {
        const statusEmoji = ticket.status === 'pending' ? '🟢' : ticket.status === 'claimed' ? '🟡' : '🔴';
        return `${statusEmoji} **${ticket.ticketNumber}** - ${ticket.deal?.slice(0, 50)}${ticket.deal && ticket.deal.length > 50 ? '...' : ''}`;
      }).join('\n');

      embed.setDescription(ticketList);
      
      if (tickets.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${tickets.length} tickets` });
      }
    }

    await interaction.reply({ embeds: [embed] });
  }

  private async handleTicketCommand(interaction: any) {
    const ticketNumber = interaction.options.getString('number');
    const ticket = await storage.getTicketByNumber(ticketNumber);

    if (!ticket) {
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, flags: 64 });
      return;
    }

    const embed = this.createTicketEmbed(ticket);
    const row = this.createTicketActionRow(ticket);

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  private async handleClaimCommand(interaction: any) {
    const ticketNumber = interaction.options.getString('number');
    const ticket = await storage.getTicketByNumber(ticketNumber);

    if (!ticket) {
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, flags: 64 });
      return;
    }

    if (ticket.status !== 'pending') {
      await interaction.reply({ content: `Ticket ${ticketNumber} is not available for claiming.`, flags: 64 });
      return;
    }

    const updatedTicket = await storage.updateTicket(ticket.id, {
      status: 'claimed',
      claimedBy: interaction.user.id,
      claimedByName: interaction.user.displayName || interaction.user.username
    });

    if (updatedTicket) {
      const embed = this.createTicketEmbed(updatedTicket);
      await interaction.reply({ content: `✅ You have claimed ticket ${ticketNumber}!`, embeds: [embed] });
    } else {
      await interaction.reply({ content: 'Failed to claim ticket.', flags: 64 });
    }
  }

  private async handleCloseCommand(interaction: any) {
    const ticketNumber = interaction.options.getString('number');
    const ticket = await storage.getTicketByNumber(ticketNumber);

    if (!ticket) {
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, flags: 64 });
      return;
    }

    if (ticket.status === 'closed') {
      await interaction.reply({ content: `Ticket ${ticketNumber} is already closed.`, flags: 64 });
      return;
    }

    const updatedTicket = await storage.updateTicket(ticket.id, {
      status: 'closed'
    });

    if (updatedTicket) {
      const embed = this.createTicketEmbed(updatedTicket);
      await interaction.reply({ content: `🔒 Ticket ${ticketNumber} has been closed.`, embeds: [embed] });
    } else {
      await interaction.reply({ content: 'Failed to close ticket.', flags: 64 });
    }
  }

  private confirmations = new Map<number, Set<string>>(); // ticketId -> set of user IDs who confirmed

  private async handleDeleteChannelCommand(message: any) {
    // Check if user has the required admin role
    const member = message.member;
    if (!member || !member.roles.cache.has(this.ADMIN_ROLE_ID)) {
      await message.reply('You do not have permission to delete channels.');
      return;
    }

    const channel = message.channel;
    if (!channel || !('delete' in channel)) {
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

  private async handleTradeConfirmation(interaction: any, action: 'confirm' | 'decline') {
    const ticketId = parseInt(interaction.customId.split('_')[2]);
    const ticket = await storage.getTicket(ticketId);

    if (!ticket) {
      await interaction.reply({ content: 'Ticket not found.', flags: 64 });
      return;
    }

    const userId = interaction.user.id;
    const isCreator = userId === ticket.creatorId;
    const isOtherParty = userId === ticket.otherUserId;

    if (!isCreator && !isOtherParty) {
      await interaction.reply({ content: 'You are not part of this trade.', flags: 64 });
      return;
    }

    if (action === 'decline') {
      // If anyone declines, delete the ticket and channel
      const declineEmbed = new EmbedBuilder()
        .setTitle('❌ Trade Declined')
        .setDescription(`${interaction.user.displayName || interaction.user.username} has declined the trade.\n\nThis ticket will be deleted in 10 seconds.`)
        .setColor(0xFF0000);

      await interaction.update({ 
        content: `Trade declined by <@${userId}>`,
        embeds: [declineEmbed],
        components: []
      });

      // Delete ticket from storage
      await storage.deleteTicket(ticketId);

      // Delete channel after delay
      setTimeout(async () => {
        try {
          if (interaction.channel && 'delete' in interaction.channel) {
            await interaction.channel.delete();
          }
        } catch (error) {
          console.error('Error deleting declined ticket channel:', error);
        }
      }, 10000);

      return;
    }

    // Handle confirmation
    if (!this.confirmations.has(ticketId)) {
      this.confirmations.set(ticketId, new Set());
    }

    const confirmationSet = this.confirmations.get(ticketId)!;
    confirmationSet.add(userId);

    // Check if both parties have confirmed
    const bothConfirmed = confirmationSet.has(ticket.creatorId) && confirmationSet.has(ticket.otherUserId);

    if (bothConfirmed) {
      // Both confirmed - proceed with middleman
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Trade Confirmed by Both Parties')
        .setDescription(`Both parties have confirmed the trade!\n\n` +
          `**Creator:** <@${ticket.creatorId}>\n` +
          `**Other Party:** <@${ticket.otherUserId}>\n\n` +
          `**Deal:** ${ticket.deal}\n\n` +
          `🛡️ **A middleman will now guide this trade. Please wait for staff assistance.**`)
        .setColor(0x00FF00)
        .setFooter({ text: 'Trade confirmed - Middleman will assist shortly' });

      await interaction.update({
        content: `🎉 Trade confirmed! <@&1365778314572333188> - New middleman request`,
        embeds: [successEmbed],
        components: []
      });

      // Clean up confirmations
      this.confirmations.delete(ticketId);

    } else {
      // Partial confirmation
      const waitingFor = confirmationSet.has(ticket.creatorId) ? ticket.otherUserId : ticket.creatorId;
      const partialEmbed = new EmbedBuilder()
        .setTitle('⏳ Waiting for Confirmation')
        .setDescription(`${interaction.user.displayName || interaction.user.username} has confirmed the trade.\n\n` +
          `Waiting for <@${waitingFor}> to confirm...`)
        .setColor(0xFFD700);

      await interaction.update({
        embeds: [partialEmbed],
        components: interaction.message.components
      });
    }
  }

  private async handleFinishCommand(interaction: any) {
    // Check if user has the required middleman role
    const member = interaction.member;
    if (!member || !member.roles.cache.has('1365778314572333188')) {
      await interaction.reply({ 
        content: 'You need the middleman role to finish tickets.', 
        flags: 64 
      });
      return;
    }

    const ticketNumber = interaction.options.getString('number');
    const ticket = await storage.getTicketByNumber(ticketNumber);

    if (!ticket) {
      await interaction.reply({ 
        content: `Ticket ${ticketNumber} not found.`, 
        flags: 64 
      });
      return;
    }

    if (ticket.status === 'closed') {
      await interaction.reply({ 
        content: `Ticket ${ticketNumber} is already closed.`, 
        flags: 64 
      });
      return;
    }

    try {
      // Update ticket status to closed
      await storage.updateTicket(ticket.id, { status: 'closed' });

      // Create professional completion embed
      const completionEmbed = new EmbedBuilder()
        .setTitle('✅ Trade Completed')
        .setDescription('This middleman ticket has been successfully completed.')
        .addFields(
          { name: 'Ticket Number', value: `#${ticket.ticketNumber}`, inline: true },
          { name: 'Status', value: 'Closed', inline: true },
          { name: 'Completed By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.reply({ embeds: [completionEmbed] });
      
    } catch (error) {
      console.error('Error finishing ticket:', error);
      await interaction.reply({ content: 'Failed to finish ticket.', flags: 64 });
    }
  }

  private async handleFeeCommand(interaction: any) {
    const feeEmbed = new EmbedBuilder()
      .setTitle('MM FEE')
      .setDescription('**MM FEE**\nThank You For Using Our services\nYour items are currently being held for the time being.\n\nTo proceed with the trade, please make the necessary donations that the MM deserves.\nWe appreciate your cooperation.')
      .setColor(0xFFA500) // Orange color for Tradeblox theme
      .setTimestamp();

    const feeInfoEmbed = new EmbedBuilder()
      .setDescription('Please be patient while a MM will list a price\nDiscuss with your trader about how you would want to do the Fee.\n\nUsers are able to split the fee OR manage to pay the full fee if possible.\n(Once clicked, you can\'t redo)')
      .setColor(0xFFD700); // Yellow color

    const feeButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('fee_split')
          .setLabel('50% Each')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('fee_full')
          .setLabel('100%')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({
      embeds: [feeEmbed, feeInfoEmbed],
      components: [feeButtons]
    });
  }

  private async handleTagMMCommand(interaction: any) {
    const mmEmbed = new EmbedBuilder()
      .setTitle('What is Middleman?')
      .setDescription('A middleman (MM) is a trusted person with many vouches who helps transactions go smoothly without scams.')
      .setColor(0xFFA500); // Orange color for Tradeblox theme

    const exampleEmbed = new EmbedBuilder()
      .setTitle('Here is an example:')
      .setDescription('Krisha has 8,000 Robux, and you want to give him an Adopt Me item. You both agree on the trade, so the middleman will take the Adopt Me item, and krisha will send the Robux to the person who had the item and then the middleman will give the item to krisha!')
      .setColor(0xFFD700); // Yellow color

    const footerEmbed = new EmbedBuilder()
      .setDescription('Click below the option')
      .setColor(0xFFA500);

    const understandButtons = new ActionRowBuilder<ButtonBuilder>()
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

  private async handleAddCommand(interaction: any) {
    // Check if user has the required middleman role
    const member = interaction.member;
    if (!member || !member.roles.cache.has('1365778314572333188')) {
      await interaction.reply({ 
        content: 'You need the middleman role to add users to tickets.', 
        flags: 64 
      });
      return;
    }

    const user = interaction.options.getUser('user');
    const channelName = interaction.channel?.name;
    
    // Try to extract ticket number from channel name (e.g., "ticket-40000")
    let ticketNumber = null;
    if (channelName && channelName.startsWith('ticket-')) {
      ticketNumber = channelName.replace('ticket-', '');
    }

    // Find the ticket from channel name
    let ticket = null;
    if (ticketNumber) {
      ticket = await storage.getTicketByNumber(ticketNumber);
    }

    if (!ticket) {
      await interaction.reply({ 
        content: 'No ticket found for this channel.', 
        flags: 64 
      });
      return;
    }

    if (ticket.status === 'closed') {
      await interaction.reply({ 
        content: `Ticket ${ticket.ticketNumber} is already closed and cannot be modified.`, 
        flags: 64 
      });
      return;
    }

    // Update the ticket with the new other user
    const updatedTicket = await storage.updateTicket(ticket.id, {
      otherUserId: user.id
    });

    if (updatedTicket) {
      // Give the added user permission to see the ticket channel
      const channel = interaction.channel;
      if (channel && 'permissionOverwrites' in channel) {
        try {
          await channel.permissionOverwrites.create(user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          });
        } catch (error) {
          console.error('Error setting channel permissions:', error);
        }
      }

      // Create confirmation embed and buttons
      const confirmationEmbed = new EmbedBuilder()
        .setTitle('🤝 Trade Confirmation Required')
        .setDescription(`**Both parties must confirm this trade:**\n\n` +
          `**Creator:** <@${ticket.creatorId}>\n` +
          `**Other Party:** <@${user.id}>\n\n` +
          `**Deal:** ${ticket.deal}\n\n` +
          `Please both click **Confirm** to proceed with middleman service, or **Decline** to cancel the trade.`)
        .setColor(0xFFD700)
        .setFooter({ text: 'Both parties must confirm within 5 minutes' });

      const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_trade_${ticket.id}`)
        .setLabel('✅ Confirm Trade')
        .setStyle(ButtonStyle.Success);

      const declineButton = new ButtonBuilder()
        .setCustomId(`decline_trade_${ticket.id}`)
        .setLabel('❌ Decline Trade')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(confirmButton, declineButton);

      await interaction.reply({ 
        content: `<@${ticket.creatorId}> <@${user.id}> Please confirm this trade!`,
        embeds: [confirmationEmbed],
        components: [row]
      });

      // Set a timeout to auto-decline after 5 minutes
      setTimeout(async () => {
        try {
          const channel = interaction.channel;
          if (channel && 'send' in channel) {
            await channel.send({
              content: '⏰ Trade confirmation timed out. Ticket will be deleted in 10 seconds.',
            });
            
            setTimeout(async () => {
              try {
                if (channel && 'delete' in channel) {
                  await channel.delete();
                }
              } catch (error) {
                console.error('Error deleting timed out ticket:', error);
              }
            }, 10000);
          }
        } catch (error) {
          console.error('Error handling timeout:', error);
        }
      }, 300000); // 5 minutes

    } else {
      await interaction.reply({ 
        content: 'Failed to add user to ticket.', 
        flags: 64 
      });
    }
  }

  private async handleSetupCommand(interaction: any) {
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

  private async handleButtonInteraction(interaction: any) {
    if (interaction.customId.startsWith('claim_')) {
      const ticketId = parseInt(interaction.customId.replace('claim_', ''));
      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        await interaction.reply({ content: 'Ticket not found.', flags: 64 });
        return;
      }

      if (ticket.status !== 'pending') {
        await interaction.reply({ content: 'This ticket is not available for claiming.', flags: 64 });
        return;
      }

      const updatedTicket = await storage.updateTicket(ticketId, {
        status: 'claimed',
        claimedBy: interaction.user.id,
        claimedByName: interaction.user.displayName || interaction.user.username
      });

      if (updatedTicket) {
        const embed = this.createTicketEmbed(updatedTicket);
        await interaction.update({ embeds: [embed], components: [this.createTicketActionRow(updatedTicket)] });
      }
    } else if (interaction.customId.startsWith('confirm_trade_')) {
      await this.handleTradeConfirmation(interaction, 'confirm');
    } else if (interaction.customId.startsWith('decline_trade_')) {
      await this.handleTradeConfirmation(interaction, 'decline');
    } else if (interaction.customId.startsWith('close_reason_')) {
      const ticketId = parseInt(interaction.customId.replace('close_reason_', ''));
      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        await interaction.reply({ content: 'Ticket not found.', flags: 64 });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`close_reason_modal_${ticketId}`)
        .setTitle('Close Ticket with Reason');

      const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('Reason for closing')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter reason for closing this ticket...')
        .setRequired(true)
        .setMaxLength(500);

      const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    } else if (interaction.customId.startsWith('close_')) {
      const ticketId = parseInt(interaction.customId.replace('close_', ''));
      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        await interaction.reply({ content: 'Ticket not found.', flags: 64 });
        return;
      }

      const updatedTicket = await storage.updateTicket(ticketId, {
        status: 'closed'
      });

      if (updatedTicket) {
        await interaction.reply({
          content: `🔒 Ticket ${updatedTicket.ticketNumber} has been closed. This channel will be deleted in 10 seconds.`,
          ephemeral: false
        });

        setTimeout(async () => {
          try {
            if (interaction.channel && 'delete' in interaction.channel) {
              await interaction.channel.delete();
            }
          } catch (error) {
            console.error('Error deleting ticket channel:', error);
          }
        }, 10000);
      }
    } else if (interaction.customId === 'fee_split') {
      const responseEmbed = new EmbedBuilder()
        .setDescription(`<@${interaction.user.id}> has chosen to split the fee\n\n*both users must agree to split fee*`)
        .setColor(0xFFA500);

      const confirmationButtons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('fee_confirm')
            .setEmoji('🤝')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('fee_deny')
            .setEmoji('😊')
            .setLabel('Decline')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.reply({
        embeds: [responseEmbed],
        components: [confirmationButtons]
      });
    } else if (interaction.customId === 'fee_full') {
      const responseEmbed = new EmbedBuilder()
        .setDescription(`<@${interaction.user.id}> has chosen to pay the full fee\n\n*Thank you for your cooperation*`)
        .setColor(0xFFA500);

      await interaction.reply({
        embeds: [responseEmbed]
      });
    } else if (interaction.customId === 'understand_yes') {
      await interaction.reply({
        content: 'Great! You understand how middleman services work. Feel free to create a ticket when you need assistance.',
        flags: 64
      });
    } else if (interaction.customId === 'understand_no') {
      await interaction.reply({
        content: 'No problem! Feel free to ask any questions in the server or read the explanation again. Our staff is here to help!',
        flags: 64
      });
    }
  }

  private async handleSelectMenuInteraction(interaction: any) {
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

      // Now show the modal with the deal value pre-selected
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

      const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(otherTraderInput);
      const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(givingInput);
      const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(receivingInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

      await interaction.showModal(modal);
    }
  }

  private async handleModalSubmit(interaction: any) {
    if (interaction.customId.startsWith('close_reason_modal_')) {
      const ticketId = parseInt(interaction.customId.replace('close_reason_modal_', ''));
      const reason = interaction.fields.getTextInputValue('close_reason');
      
      const updatedTicket = await storage.updateTicket(ticketId, {
        status: 'closed'
      });

      if (updatedTicket) {
        await interaction.reply({
          content: `🔒 Ticket closed with reason: ${reason}. This channel will be deleted in 10 seconds.`,
          ephemeral: false
        });

        setTimeout(async () => {
          try {
            if (interaction.channel && 'delete' in interaction.channel) {
              await interaction.channel.delete();
            }
          } catch (error) {
            console.error('Error deleting ticket channel:', error);
          }
        }, 10000);
      }
    } else if (interaction.customId.startsWith('ticket_modal_')) {
      // Extract deal value from the custom ID
      const dealValue = interaction.customId.replace('ticket_modal_', '');
      let dealValueLabel = '';
      
      switch (dealValue) {
        case 'up_to_50':
          dealValueLabel = 'Up to $50';
          break;
        case 'up_to_150':
          dealValueLabel = 'Up to $150';
          break;
        case 'up_to_350':
          dealValueLabel = 'Up to $350';
          break;
      }
      const otherTrader = interaction.fields.getTextInputValue('otherTrader');
      const giving = interaction.fields.getTextInputValue('giving');
      const receiving = interaction.fields.getTextInputValue('receiving');

      try {
        const ticketData = {
          creatorId: interaction.user.id,
          creatorName: interaction.user.displayName || interaction.user.username,
          deal: `[${dealValueLabel}] Trading: ${giving} ↔ ${receiving}`,
          amount: `${giving} for ${receiving}`,
          otherUserId: otherTrader,
          category: "middleman"
        };

        const validatedData = insertTicketSchema.parse(ticketData);
        const ticket = await storage.createTicket(validatedData);

        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
          return;
        }

        try {
          // Function to find or create available category
          const findAvailableCategory = async () => {
            const primaryCategory = guild.channels.cache.get('1365778563894349977');
            
            if (primaryCategory && primaryCategory.children.cache.size < 50) {
              return '1365778563894349977';
            }
            
            // Look for existing overflow categories
            const overflowCategories = guild.channels.cache.filter((channel: GuildChannel) => 
              channel.type === ChannelType.GuildCategory && 
              channel.name.startsWith('Middleman Tickets')
            );
            
            for (const [, category] of overflowCategories) {
              if (category.children.cache.size < 50) {
                return category.id;
              }
            }
            
            // Create new overflow category
            const newCategory = await guild.channels.create({
              name: `Middleman Tickets ${overflowCategories.size + 1}`,
              type: ChannelType.GuildCategory,
              permissionOverwrites: [
                {
                  id: guild.id,
                  deny: ['ViewChannel'],
                },
                {
                  id: '1365778314572333188', // Required role ID
                  allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
                }
              ],
            });
            
            return newCategory.id;
          };

          const categoryId = await findAvailableCategory();

          const ticketChannel = await guild.channels.create({
            name: `ticket-${ticket.ticketNumber.toLowerCase()}`,
            type: ChannelType.GuildText,
            parent: categoryId,
            topic: `Middleman request by ${interaction.user.username}`,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: ['ViewChannel'],
              },
              {
                id: interaction.user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
              },
              {
                id: '1365778314572333188', // Required role ID
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
              }
            ],
          });

          const ticketEmbed = this.createTicketDisplayEmbed(otherTrader, giving, receiving, dealValueLabel);
          const actionRow = this.createTicketActionRow(ticket);
          
          const confirmationEmbed = new EmbedBuilder()
            .setDescription('Please wait until a trusted middleman claims your ticket!\n\nRemember patient is the key!')
            .setColor(0x00DCDC)
            .setFooter({ text: 'Powered by tickets.bot' });

          await ticketChannel.send({ 
            content: `<@${interaction.user.id}> Your ticket has been created!`,
            embeds: [confirmationEmbed, ticketEmbed],
            components: [actionRow]
          });

          await interaction.reply({ 
            content: `✅ Ticket created! Please check ${ticketChannel}`,
            flags: 64
          });

        } catch (error) {
          console.error('Error creating ticket channel:', error);
          await interaction.reply({ 
            content: 'Failed to create ticket channel. Please contact an administrator.', 
            flags: 64 
          });
        }
      } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({ 
          content: 'Failed to create ticket. Please check your input and try again.', 
          flags: 64 
        });
      }
    }
  }

  private createTicketDisplayEmbed(otherTrader: string, giving: string, receiving: string, dealValue?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setDescription(`${dealValue ? `**Deal Value Range:** ${dealValue}\n\n` : ''}**What is the other trader's username?**\n${otherTrader}\n\n**What are you giving?**\n${giving}\n\n**What is the other trader giving?**\n${receiving}`)
      .setColor(0x00DCDC)
      .setFooter({ text: 'Powered by tickets.bot' });

    return embed;
  }

  private createTicketEmbed(ticket: Ticket): EmbedBuilder {
    const statusEmoji = ticket.status === 'pending' ? '🟢' : ticket.status === 'claimed' ? '🟡' : '🔴';
    const statusColor = ticket.status === 'pending' ? 0x00FF00 : ticket.status === 'claimed' ? 0xFFFF00 : 0xFF0000;

    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji} Ticket ${ticket.ticketNumber}`)
      .setColor(statusColor)
      .addFields(
        { name: '📝 Deal Description', value: ticket.deal || 'No description', inline: false },
        { name: '💰 Amount/Value', value: ticket.amount || 'Not specified', inline: true },
        { name: '👤 Created By', value: `<@${ticket.creatorId}>`, inline: true },
        { name: '🆔 Other User', value: ticket.otherUserId || 'Not specified', inline: true },
        { name: '📊 Status', value: ticket.status.toUpperCase(), inline: true }
      )
      .setTimestamp(ticket.createdAt ? new Date(ticket.createdAt) : new Date())
      .setFooter({ text: 'Powered by Tradeblox' });

    if (ticket.claimedBy) {
      embed.addFields({ name: '🎯 Claimed By', value: `<@${ticket.claimedBy}>`, inline: true });
    }

    return embed;
  }

  private createTicketActionRow(ticket: Ticket): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (ticket.status === 'pending') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${ticket.id}`)
          .setLabel('Claim')
          .setEmoji('🛡️')
          .setStyle(ButtonStyle.Success)
      );
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${ticket.id}`)
        .setLabel('Close')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    if (ticket.status !== 'closed') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`close_reason_${ticket.id}`)
          .setLabel('Close With Reason')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );
    }

    return row;
  }

  public async start(): Promise<void> {
    try {
      await this.client.login(this.token);
    } catch (error) {
      console.error('Failed to start bot:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.client.destroy();
  }
}