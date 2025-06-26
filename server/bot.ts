import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events, ComponentType } from 'discord.js';
import { storage } from './storage.js';
import { insertTicketSchema, Ticket } from '../shared/schema.js';
import { z } from 'zod';

export class TradebloxBot {
  public client: Client;
  private token: string;

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

  private setupEventHandlers() {
    this.client.once(Events.ClientReady, (readyClient) => {
      console.log(`Bot ready! Logged in as ${readyClient.user.tag}`);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButtonInteraction(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModalSubmit(interaction);
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
        .setDescription('Setup the ticket creation embed (Admin only)')
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
          await this.handleSetupCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command!', ephemeral: true });
      }
    } catch (error) {
      console.error('Error handling slash command:', error);
      await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
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
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, ephemeral: true });
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
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, ephemeral: true });
      return;
    }

    if (ticket.status !== 'pending') {
      await interaction.reply({ content: `Ticket ${ticketNumber} is not available for claiming.`, ephemeral: true });
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
      await interaction.reply({ content: 'Failed to claim ticket.', ephemeral: true });
    }
  }

  private async handleCloseCommand(interaction: any) {
    const ticketNumber = interaction.options.getString('number');
    const ticket = await storage.getTicketByNumber(ticketNumber);

    if (!ticket) {
      await interaction.reply({ content: `Ticket ${ticketNumber} not found.`, ephemeral: true });
      return;
    }

    if (ticket.status === 'closed') {
      await interaction.reply({ content: `Ticket ${ticketNumber} is already closed.`, ephemeral: true });
      return;
    }

    const updatedTicket = await storage.updateTicket(ticket.id, {
      status: 'closed'
    });

    if (updatedTicket) {
      const embed = this.createTicketEmbed(updatedTicket);
      await interaction.reply({ content: `🔒 Ticket ${ticketNumber} has been closed.`, embeds: [embed] });
    } else {
      await interaction.reply({ content: 'Failed to close ticket.', ephemeral: true });
    }
  }

  private async handleSetupCommand(interaction: any) {
    const embed = new EmbedBuilder()
      .setTitle('Request a middleman')
      .setDescription(`**Middleman Service**

🔸 To request a middleman from Tradeblox | MM & Trading, click the Red "Request a MM" button on this message.

**How does middleman work?**
✕ Example: Trade is NFR Crow for Robux.
Seller gives NFR Crow to middleman
Buyer pays seller robux (After middleman confirms receiving pet)
Middleman gives buyer NFR Crow (After seller confirmed receiving robux)

**NOTES:**
1. You must both agree on the deal before using a middleman. Troll tickets will have consequences.

2. Specify what you're trading (e.g. FR Frost Dragon in Adopt me > $20 USD LTC). Don't just put "adopt me" in the embed.

**Trade Blox**`)
      .setColor(0xFF8C00) // Orange color matching the theme
      .setThumbnail('https://cdn.discordapp.com/attachments/your-image-url-here/tradeblox-logo.png') // You'll need to upload this
      .setFooter({ text: 'Powered by ticketsbot.cloud', iconURL: 'https://cdn.discordapp.com/emojis/your-tickets-emoji.png' });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('Request a MM')
          .setStyle(ButtonStyle.Danger) // Red button as shown in image
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  private async handleButtonInteraction(interaction: any) {
    if (interaction.customId === 'create_ticket') {
      const modal = new ModalBuilder()
        .setCustomId('ticket_modal')
        .setTitle('Middleman Request');

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
    } else if (interaction.customId.startsWith('claim_')) {
      const ticketId = parseInt(interaction.customId.replace('claim_', ''));
      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        await interaction.reply({ content: 'Ticket not found.', ephemeral: true });
        return;
      }

      if (ticket.status !== 'pending') {
        await interaction.reply({ content: 'This ticket is not available for claiming.', ephemeral: true });
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
    } else if (interaction.customId.startsWith('close_reason_')) {
      const ticketId = parseInt(interaction.customId.replace('close_reason_', ''));
      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        await interaction.reply({ content: 'Ticket not found.', ephemeral: true });
        return;
      }

      // Create modal for close reason
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
        await interaction.reply({ content: 'Ticket not found.', ephemeral: true });
        return;
      }

      const updatedTicket = await storage.updateTicket(ticketId, {
        status: 'closed'
      });

      if (updatedTicket) {
        const embed = this.createTicketEmbed(updatedTicket);
        await interaction.update({ embeds: [embed], components: [this.createTicketActionRow(updatedTicket)] });
      }
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
        const embed = this.createTicketEmbed(updatedTicket);
        await interaction.update({ 
          embeds: [embed], 
          components: [this.createTicketActionRow(updatedTicket)],
          content: `Ticket closed with reason: ${reason}`
        });
      }
    } else if (interaction.customId === 'ticket_modal') {
      const otherTrader = interaction.fields.getTextInputValue('otherTrader');
      const giving = interaction.fields.getTextInputValue('giving');
      const receiving = interaction.fields.getTextInputValue('receiving');

      try {
        const ticketData = {
          creatorId: interaction.user.id,
          creatorName: interaction.user.displayName || interaction.user.username,
          deal: `Trading: ${giving} ↔ ${receiving}`,
          amount: `${giving} for ${receiving}`,
          otherUserId: otherTrader
        };

        const validatedData = insertTicketSchema.parse(ticketData);
        const ticket = await storage.createTicket(validatedData);

        // Create the ticket display embed with action buttons
        const ticketEmbed = this.createTicketDisplayEmbed(otherTrader, giving, receiving);
        const actionRow = this.createTicketActionRow(ticket);
        
        // Send confirmation message
        const confirmationEmbed = new EmbedBuilder()
          .setDescription('Please wait until a trusted middleman claims your ticket!\n\nRemember patient is the key!')
          .setColor(0x00DCDC) // Cyan color from the images
          .setThumbnail('https://cdn.discordapp.com/attachments/your-tradeblox-logo-url/tradeblox-logo.png')
          .setFooter({ text: 'Powered by tickets.bot', iconURL: 'https://cdn.discordapp.com/emojis/your-tickets-emoji.png' });

        await interaction.reply({ 
          embeds: [confirmationEmbed, ticketEmbed],
          components: [actionRow],
          ephemeral: false
        });
      } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({ 
          content: 'Failed to create ticket. Please check your input and try again.', 
          ephemeral: true 
        });
      }
    }
  }

  private createTicketDisplayEmbed(otherTrader: string, giving: string, receiving: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setDescription(`**What is the other trader's username?**\n${otherTrader}\n\n**What are you giving?**\n${giving}\n\n**What is the other trader giving?**\n${receiving}`)
      .setColor(0x00DCDC) // Cyan color matching the theme
      .setFooter({ text: 'Powered by tickets.bot', iconURL: 'https://cdn.discordapp.com/emojis/your-tickets-emoji.png' });

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

  private createTicketActionButtons(ticket: Ticket): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    // Close button (red)
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${ticket.id}`)
        .setLabel('Close')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    // Close with reason button (red)
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`close_reason_${ticket.id}`)
        .setLabel('Close With Reason')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    // Claim button (green) - only if pending
    if (ticket.status === 'pending') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${ticket.id}`)
          .setLabel('Claim')
          .setEmoji('🛡️')
          .setStyle(ButtonStyle.Success)
      );
    }

    return row;
  }

  private createTicketActionRow(ticket: Ticket): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (ticket.status === 'pending') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${ticket.id}`)
          .setLabel('Claim Ticket')
          .setEmoji('🎯')
          .setStyle(ButtonStyle.Success)
      );
    }

    if (ticket.status !== 'closed') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`close_${ticket.id}`)
          .setLabel('Close Ticket')
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