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
      .setTitle('🎫 Request a Middleman')
      .setDescription('Need a secure middleman for your trade? Click the button below to create a ticket and get matched with a trusted middleman from our team.')
      .addFields(
        { name: '🛡️ Secure Trading', value: 'All trades are monitored and protected', inline: true },
        { name: '⚡ Fast Response', value: 'Get matched with a middleman quickly', inline: true },
        { name: '✅ Trusted Service', value: 'Join thousands of successful trades', inline: true }
      )
      .setColor(0xFFD700)
      .setFooter({ text: 'Powered by Tradeblox' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('Request a Middleman')
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  private async handleButtonInteraction(interaction: any) {
    if (interaction.customId === 'create_ticket') {
      const modal = new ModalBuilder()
        .setCustomId('ticket_modal')
        .setTitle('Create Middleman Request');

      const dealInput = new TextInputBuilder()
        .setCustomId('deal')
        .setLabel('What are you trading?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe what you\'re trading...')
        .setRequired(true)
        .setMaxLength(1000);

      const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Trade Amount/Value')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 5,000 Robux, $50, etc.')
        .setRequired(true)
        .setMaxLength(100);

      const otherUserInput = new TextInputBuilder()
        .setCustomId('otherUserId')
        .setLabel('Other User\'s Discord ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789012345678')
        .setRequired(true)
        .setMaxLength(20);

      const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(dealInput);
      const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput);
      const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(otherUserInput);

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
    if (interaction.customId === 'ticket_modal') {
      const deal = interaction.fields.getTextInputValue('deal');
      const amount = interaction.fields.getTextInputValue('amount');
      const otherUserId = interaction.fields.getTextInputValue('otherUserId');

      try {
        const ticketData = {
          creatorId: interaction.user.id,
          creatorName: interaction.user.displayName || interaction.user.username,
          deal,
          amount,
          otherUserId
        };

        const validatedData = insertTicketSchema.parse(ticketData);
        const ticket = await storage.createTicket(validatedData);

        const embed = this.createTicketEmbed(ticket);
        const row = this.createTicketActionRow(ticket);

        await interaction.reply({ 
          content: `✅ Ticket ${ticket.ticketNumber} created successfully!`, 
          embeds: [embed], 
          components: [row],
          ephemeral: true 
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
        { name: '🆔 Other User', value: `<@${ticket.otherUserId}>`, inline: true },
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