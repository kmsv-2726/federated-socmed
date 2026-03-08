import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "federatedsocialnetwork@gmail.com",
        pass: "hbwe nvoo lrlu qfrp"
    }
});

export const sendUnlockEmail = async (recipientEmail, unlockToken) => {
    const unlockLink = `http://localhost:5173/unlock-account?token=${unlockToken}`;

    const mailOptions = {
        from: "federatedsocialnetwork@gmail.com",
        to: recipientEmail,
        subject: "Security Alert: Your Account Has Been Locked",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ef4444; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Account Locked</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">Hello,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">We noticed 5 consecutive failed login attempts on your account. For your security, we have temporarily locked your account.</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.5;">If this was you, or if you want to regain access, please click the button below to instantly unlock your account.</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${unlockLink}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Unlock My Account</a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="font-size: 14px; color: #3b82f6; word-break: break-all;">${unlockLink}</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">This unlock link will expire in 24 hours. If you did not attempt to log in, we highly recommend changing your password once you regain access.</p>
        </div>
      </div>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Unlock email successfully sent to ${recipientEmail}`);
    } catch (err) {
        console.error(`[EmailService] Error sending unlock email to ${recipientEmail}:`, err);
        throw err;
    }
};
