const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const paypal = require('@paypal/checkout-server-sdk');
const supabase = require('./supabase');

// PayPal configuration
function validatePayPalConfig() {
    console.log('PayPal Mode:', process.env.PAYPAL_MODE);
    console.log('Client ID Length:', process.env.PAYPAL_CLIENT_ID?.length);
    console.log('Client Secret Length:', process.env.PAYPAL_CLIENT_SECRET?.length);
    
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        throw new Error('PayPal credentials are missing');
    }
}

function getPayPalClient() {
    try {
        validatePayPalConfig();
        
        // Create environment
        let environment;
        if (process.env.PAYPAL_MODE === 'live') {
            environment = new paypal.core.LiveEnvironment(
                process.env.PAYPAL_CLIENT_ID,
                process.env.PAYPAL_CLIENT_SECRET
            );
        } else {
            environment = new paypal.core.SandboxEnvironment(
                process.env.PAYPAL_CLIENT_ID,
                process.env.PAYPAL_CLIENT_SECRET
            );
        }

        // Create and return client
        return new paypal.core.PayPalHttpClient(environment);
    } catch (error) {
        console.error('PayPal client initialization error:', error);
        throw error;
    }
}

async function createPaymentRequest(interaction, amount, description, userId, ticketId) {
    try {
        const client = getPayPalClient();

        // Create order with proper headers and formatting
        const request = new paypal.orders.OrdersCreateRequest();
        request.headers['prefer'] = 'return=representation';
        request.requestBody({
            intent: 'CAPTURE',
            application_context: {
                return_url: 'https://example.com/success', // Add your success URL
                cancel_url: 'https://example.com/cancel',  // Add your cancel URL
                brand_name: 'Your Brand Name',
                landing_page: 'NO_PREFERENCE',
                user_action: 'PAY_NOW'
            },
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: amount.toFixed(2) // Ensure proper decimal formatting
                },
                description: description
            }]
        });

        // Execute request
        const order = await client.execute(request);

        // Create payment record in database
        const { data: payment, error } = await supabase
            .from('payments')
            .insert([{
                ticket_id: ticketId,
                user_id: userId,
                amount: amount,
                description: description,
                status: 'pending',
                requested_by: interaction.user.id,
                paypal_order_id: order.result.id,
                created_at: new Date()
            }])
            .select()
            .single();

        if (error) throw error;

        // Create payment embed
        const embed = new EmbedBuilder()
            .setTitle('Payment Request')
            .setDescription(description)
            .addFields(
                { name: 'Amount', value: `$${amount.toFixed(2)}`, inline: true },
                { name: 'Status', value: 'Pending', inline: true },
                { name: 'Requested By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setColor('#FF9900')
            .setTimestamp();

        // Get the approval URL from the order response
        const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;

        // Create payment button with PayPal link and delete button
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Pay with PayPal')
                    .setStyle(ButtonStyle.Link)
                    .setURL(approvalUrl),
                new ButtonBuilder()
                    .setCustomId(`check_payment_${payment.id}`)
                    .setLabel('Check Payment Status')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`delete_payment_${payment.id}`)
                    .setLabel('Delete Request')
                    .setStyle(ButtonStyle.Danger)
            );

        return { embed, row };
    } catch (error) {
        console.error('Error creating payment request:', error);
        console.error('Detailed error:', JSON.stringify(error, null, 2));
        throw error;
    }
}

async function checkPaymentStatus(paymentId) {
    try {
        // Get payment details from database
        const { data: payment, error } = await supabase
            .from('payments')
            .select('paypal_order_id')
            .eq('id', paymentId)
            .single();

        if (error) throw error;

        // Check PayPal order status
        const request = new paypal.orders.OrdersGetRequest(payment.paypal_order_id);
        const paypalClient = getPayPalClient();
        const order = await paypalClient.execute(request);

        const status = order.result.status;
        
        // Map PayPal status to our database status
        let dbStatus = status.toLowerCase();
        if (status === 'APPROVED') {
            dbStatus = 'completed';  // Map APPROVED to completed for database
        }
        
        // Update payment status in database if completed or approved
        if (status === 'COMPLETED' || status === 'APPROVED') {
            await updatePaymentStatus(paymentId, dbStatus);
            
            // Get PayPal receipt URL - using the self link as receipt URL
            const receiptUrl = order.result.links.find(link => link.rel === 'self')?.href || null;
            return { status: status.toLowerCase(), receiptUrl };
        }
        
        return { status: status.toLowerCase() };
    } catch (error) {
        console.error('Error checking payment status:', error);
        throw error;
    }
}

async function updatePaymentStatus(paymentId, status) {
    try {
        const { data: payment, error } = await supabase
            .from('payments')
            .update({ 
                status: status,
                paid_at: status === 'completed' ? new Date() : null 
            })
            .eq('id', paymentId)
            .select()
            .single();

        if (error) throw error;
        return payment;
    } catch (error) {
        console.error('Error updating payment status:', error);
        throw error;
    }
}

async function requestRefund(paymentId, reason) {
    try {
        // Get payment details
        const { data: payment, error } = await supabase
            .from('payments')
            .select('paypal_order_id')
            .eq('id', paymentId)
            .single();

        if (error) throw error;

        // Create PayPal refund request
        const paypalClient = getPayPalClient();
        const request = new paypal.payments.CapturesRefundRequest(payment.paypal_order_id);
        request.requestBody({
            note_to_payer: reason
        });

        await paypalClient.execute(request);

        // Update payment status in database
        const updateResult = await supabase
            .from('payments')
            .update({ 
                status: 'refunded',
                refund_reason: reason,
                refunded_at: new Date()
            })
            .eq('id', paymentId)
            .select()
            .single();

        if (updateResult.error) throw updateResult.error;
        return updateResult.data;
    } catch (error) {
        console.error('Error processing refund:', error);
        throw error;
    }
}

module.exports = {
    createPaymentRequest,
    checkPaymentStatus,
    updatePaymentStatus,
    requestRefund
}; 