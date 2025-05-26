import mongoose from "mongoose";
import { asyncMiddleware } from "../middlewares";
import { BalanceSheet } from "../models/BalanceSheet";

export const CONTROLLER_BALANCESHEET = {
  create: asyncMiddleware(async (req, res) => {
    try {
      const { userId, date, dateFlag, data } = req.body;
      const existingBalanceSheet = await BalanceSheet.findOne({ userId, date });
      if (existingBalanceSheet) {
        existingBalanceSheet.data = data;
        await existingBalanceSheet.updateOne({ $set: { data: data } });
        res
          .status(201)
          .json({
            message: "BalanceSheet Updated successfully",
            data: existingBalanceSheet.toObject(),
          });
      } else {
        const balanceSheet = new BalanceSheet({
          userId: userId,
          date: date,
          dateFlag: dateFlag,
          data: data,
        });
        const savedBalanceSheet = await balanceSheet.save();
        res
          .status(201)
          .json({
            message: "BalanceSheet created successfully",
            data: savedBalanceSheet.toObject(),
          });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }),

  getBalanceSheet: asyncMiddleware(async (req, res) => {
    try {
      const { userId, date } = req.body;
      const balanceSheet = await BalanceSheet.findOne({ userId, date });
      if (!balanceSheet) {
        return res.status(404).json({ message: "BalanceSheet Not Founded!" });
      } else {
        res
          .status(201)
          .json({
            message: "BalanceSheet Successfully Downloaded!",
            data: balanceSheet.toObject(),
          });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }),

  getBalanceSheetByMonth: asyncMiddleware(async (req, res) => {
    try {
      const { userId, date } = req.body;
      const balanceSheet = await BalanceSheet.find({
        $and: [{ dateFlag: { $gte: date.from }, userId: userId }],
      });
      const result = balanceSheet.filter((item) => item.dateFlag <= date.to);
      const mongooseUserId = new mongoose.Types.ObjectId(userId);
      const total = await BalanceSheet.aggregate([
        {
          $match: {
            userId: mongooseUserId,
          },
        },
        {
          $unwind: "$data",
        },
        {
          $project: {
            accountId: {
              $cond: {
                if: { $isArray: "$data" },
                then: { $arrayElemAt: ["$data", 0] },
                else: null,
              },
            },
            amount: {
              $cond: {
                if: { $isArray: "$data" },
                then: { $arrayElemAt: ["$data", 2] },
                else: 0,
              },
            },
          },
        },
        {
          $group: {
            _id: "$accountId",
            lifetime_balance: { $sum: "$amount" },
          },
        },
        {
          $project: {
            _id: 0,
            AccountId: "$_id",
            lifetime_balance: 1,
          },
        },
      ]);

      if (result.length == 0) {
        res.status(404).json({ message: "BalanceSheet Not Founded!" });
      } else {
        res
          .status(201)
          .json({
            message: "BalanceSheet Successfully Downloaded!",
            data: result,
            total: total,
          });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }),
};
