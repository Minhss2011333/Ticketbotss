import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events, ComponentType, ChannelType, StringSelectMenuBuilder } from 'discord.js';
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
      } else if (interaction.isStringSelectMenu()) {
        await this.handleSelectMenuInteraction(interaction);
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
          otherUserId: otherTrader
        };

        const validatedData = insertTicketSchema.parse(ticketData);
        const ticket = await storage.createTicket(validatedData);

        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
          return;
        }

        try {
          const ticketChannel = await guild.channels.create({
            name: `ticket-${ticket.ticketNumber.toLowerCase()}`,
            type: ChannelType.GuildText,
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
              ...guild.roles.cache
                .filter((role: any) => role.name.toLowerCase().includes('middleman') || role.name.toLowerCase().includes('staff'))
                .map((role: any) => ({
                  id: role.id,
                  allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                }))
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
            ephemeral: true
          });

        } catch (error) {
          console.error('Error creating ticket channel:', error);
          await interaction.reply({ 
            content: 'Failed to create ticket channel. Please contact an administrator.', 
            ephemeral: true 
          });
        }
      } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({ 
          content: 'Failed to create ticket. Please check your input and try again.', 
          ephemeral: true 
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