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

export const sendCommentNotificationEmail = async (toEmail, ticketTitle, commenterName, commentText, link, isInternal) => {
    const subject = `New Comment on "${ticketTitle}"`;
    const internalLabel = isInternal ? '[INTERNAL] ' : '';

    // Check if internal and simple guard (though router should handle this too)
    // We trust the router to only call this for valid recipients

    const mailOptions = {
        from: `"CEiVoice Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `${internalLabel}${subject}`,
        text: `New comment from ${commenterName} on ticket "${ticketTitle}":\n\n"${commentText}"\n\nView here: ${link}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>${internalLabel}New Comment</h2>
                <p><strong>${commenterName}</strong> commented on <strong>"${ticketTitle}"</strong>:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1976d2; margin: 20px 0; font-style: italic;">
                    "${commentText}"
                </div>
                <p>View the ticket using the link below:</p>
                <div style="margin: 20px 0;">
                    <a href="${link}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Comment</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
                <p style="font-size: 12px; color: #888;">This is an automated message, please do not reply.</p>
            </div>
        `,
    };

    try {
        if (!process.env.SMTP_HOST) {
            console.log("SMTP not configured, skipping comment email.");
            return;
        }
        await transporter.sendMail(mailOptions);
        console.log(`Comment email sent to ${toEmail}`);
    } catch (error) {
        console.error('Error sending comment email:', error);
    }
};

export const sendAssignmentNotificationEmail = async (toEmail, ticketTitle, assignerEmail, link) => {
    const subject = `You have been assigned to "${ticketTitle}"`;

    const mailOptions = {
        from: `"CEiVoice Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: subject,
        text: `Hello,\n\nYou have been assigned to the ticket "${ticketTitle}" by ${assignerEmail}.\n\nView the ticket here: ${link}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Ticket Assignment</h2>
                <p>Hello,</p>
                <p>You have been assigned to the ticket <strong>"${ticketTitle}"</strong> by <strong>${assignerEmail}</strong>.</p>
                <p>View the ticket using the link below:</p>
                <div style="margin: 20px 0;">
                    <a href="${link}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Ticket</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
                <p style="font-size: 12px; color: #888;">This is an automated message, please do not reply.</p>
            </div>
        `,
    };

    try {
        if (!process.env.SMTP_HOST) {
            console.log("SMTP not configured, skipping assignment email.");
            return;
        }
        await transporter.sendMail(mailOptions);
        console.log(`Assignment email sent to ${toEmail}`);
    } catch (error) {
        console.error('Error sending assignment email:', error);
    }
};
