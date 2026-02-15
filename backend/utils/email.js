import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendConfirmationEmail = async (toEmail, trackingToken) => {
    const trackingLink = `http://localhost:${process.env.FRONTEND_PORT}/track/${trackingToken}`;

    const mailOptions = {
        from: `"CEiVoice Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Support Request Received - CEiVoice',
        text: `Your support request has been received. You can track its status here: ${trackingLink}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Support Request Received</h2>
                <p>Hello,</p>
                <p>Thank you for reaching out. We have received your request and a draft ticket has been created for review by our team.</p>
                <p>You can track the progress of your request using the link below:</p>
                <div style="margin: 20px 0;">
                    <a href="${trackingLink}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Track Request Status</a>
                </div>
                <p>Or copy this link: <br/> ${trackingLink}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
                <p style="font-size: 12px; color: #888;">This is an automated message, please do not reply.</p>
            </div>
        `,
    };

    try {
        if (!process.env.SMTP_HOST) {
            console.log("SMTP not configured, skipping email.");
            return;
        }
        await transporter.sendMail(mailOptions);
        console.log(`Confirmation email sent to ${toEmail}`);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
    }
};

export const sendStatusUpdateEmail = async (toEmail, ticketTitle, newStatus, trackingToken) => {
    const trackingLink = `http://localhost:${process.env.FRONTEND_PORT}/track/${trackingToken}`;

    const mailOptions = {
        from: `"CEiVoice Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Status Update: ${ticketTitle}`,
        text: `The status of your ticket "${ticketTitle}" has been updated to: ${newStatus}. Track here: ${trackingLink}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Ticket Status Updated</h2>
                <p>Hello,</p>
                <p>The status of your ticket <strong>"${ticketTitle}"</strong> has been updated to: <span style="font-weight: bold; color: #1976d2;">${newStatus}</span></p>
                <p>View more details using the link below:</p>
                <div style="margin: 20px 0;">
                    <a href="${trackingLink}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Ticket</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
                <p style="font-size: 12px; color: #888;">This is an automated message, please do not reply.</p>
            </div>
        `,
    };

    try {
        if (!process.env.SMTP_HOST) {
            console.log("SMTP not configured, skipping status update email.");
            return;
        }
        await transporter.sendMail(mailOptions);
        console.log(`Status update email sent to ${toEmail}`);
    } catch (error) {
        console.error('Error sending status update email:', error);
    }
};
