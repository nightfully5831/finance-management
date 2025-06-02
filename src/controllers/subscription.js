import { asyncMiddleware } from '../middlewares'
import { User } from '../models/User';
import Stripe from "stripe";
import { PLAN_TYPES } from '../utils';
import dotenv from 'dotenv'

dotenv.config()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const CONTROLLER_SUBSCRIPTION = {
  create: asyncMiddleware(async (req, res) => {
    try {
      const { email, planType } = req.body;
      
      const user = await User.findOne({email:email})
      if (!user) {
        return res.status(404).json({error: 'User Not Found!'})
      }

      let session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        billing_address_collection: 'auto',
        customer_email: user.email, 
        line_items: [{ price: PLAN_TYPES[planType], quantity: 1 }],
        mode: "subscription",
        success_url: process.env.PUBLIC_SITE_URL,
        cancel_url: process.env.PUBLIC_SITE_URL,
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error('Stripe Checkout Error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }),
  

  update: asyncMiddleware(async (req, res) => {
    try {
      const { email, planType, subscriptionId } = req.body;

      const user = await User.findOne({email:email})
      if (!user) {
        return res.status(404).json({error: 'User Not Found!'})
      }

      if(subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if(subscription && subscription.status === 'active') {
          await stripe.subscriptions.update(subscription.id, {
            items: [{ id: subscription.items.data[0].id, price: PLAN_TYPES[planType]}],
            proration_behavior: "create_prorations", // immediately attempt charge to user 
            payment_behavior: "error_if_incomplete", // ensure subscription is only update if payment is successful
          });
          return res.json({ url: `${process.env.PUBLIC_SITE_URL}/subscription` });
        }
      } else {
        return res.status(404).json({error:'Subscription ID not found!'})
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }),

  getSubscription: asyncMiddleware(async (req, res) => {
    try {
      const { email , subscriptionId } = req.body;
      
      const user = await User.findOne({email:email})
      if (!user) {
        return res.status(404).json({error: 'User Not Found!'})
      }

      if(subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if(subscription && subscription.status === 'active') {
          const currentPriceId = PLAN_TYPES['pro'] === subscription.items.data[0].price.id ? 'pro' : 'common';
          return res.json({message:'Successfully doload', plan: currentPriceId})
        } else {
          return res.json({plan:'free'})
        }
      } else {
        return res.status(404).json({error:'Subscrpitoin Not Found'})
      }

    } catch (error) {
      res.status(500).json({message: 'Server error', error: error.message})
    }
  }),

  cancel: asyncMiddleware(async (req, res) => {
    try {
      const { email, subscriptionId } = req.body;
      
      const user = await User.findOne({email:email})
      if (!user) {
        return res.status(404).json({error: 'User Not Found!'})
      }
      console.log('subscription',subscriptionId)
      if(subscriptionId) {
        await stripe.subscriptions.del(subscriptionId);
        return res.json({ message: "Subscription canceled successfully!", plan:'free' });
      } else {
        return res.status(404).json({error:'SubscrpitionId Not Found'})
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  })
}