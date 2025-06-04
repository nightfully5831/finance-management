import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { User } from './models';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

cron.schedule('0 9 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfDay = new Date(tomorrow.setHours(0, 0, 0, 0));
  const endOfDay = new Date(tomorrow.setHours(23, 59, 59, 999));

  const users = await User.find({
    trialEndsAt: { $gte: startOfDay, $lte: endOfDay },
    notifiedBeforeExpiry: false,
  });

  if(users.length === 0) {
    console.log('No users found with trials expiring tomorrow!');
  } else {
    for (const user of users) {
      const mailOptions = {
        to: user.email,
        from: process.env.EMAIL_ADDRESS,
        subject: 'Your free trial is expiring soon!',
        text: `Hi ${user.name},\n\nJust a reminder: your free trial will expire in 1 day. Please upgrade to continue using the service.\n\nThanks!`,
      };
      try {
        await transporter.sendMail(mailOptions);
        user.notifiedBeforeExpiry = true;
        await user.save();
      } catch (err) {
        console.error(`Failed to send reminder to ${user.email}`, err);
      }
    }
  }
});
