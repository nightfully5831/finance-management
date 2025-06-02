import express from "express";
import dotenv from "dotenv";
import Stripe from "stripe";
import { User } from '../models'

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        const subscriptionId = session.subscription;
        const email = session.customer_email;

        console.log("✅ Checkout completed for:", email);

        await User.findOneAndUpdate(
          { email: email },
          {
            subscriptionID: subscriptionId,
          }
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log("🔄 Subscription updated:", subscription.id, subscription.status);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const customer = await stripe.customers.retrieve(customerId);
        const email = customer.email;

        await User.findOneAndUpdate({ email: email }, { subscriptionID: "" });
        console.log("❌ Subscription canceled:", subscription.id);
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("💥 Webhook handler failed:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
