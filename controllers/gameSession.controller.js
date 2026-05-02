import GameSession from "../models/GameLead.js";

export const createGameSession = async (req, res) => {
  try {
    const { profile, weakSubjectLabels } = req.body;

    const session = await GameSession.create({
      profile,
      weakSubjectLabels
    });

    res.status(201).json({
      success: true,
      message: "Game session created",
      data: session
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Session already exists for this attempt"
      });
    }

    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateGameSession = async (req, res) => {
  try {
    const { whatsapp, attemptNumber } = req.params;

    const updatedSession = await GameSession.findOneAndUpdate(
      {
        "profile.whatsapp": whatsapp,
        "profile.attemptNumber": attemptNumber
      },
      {
        $set: req.body
      },
      {
        new: true
      }
    );

    if (!updatedSession) {
      return res.status(404).json({
        success: false,
        message: "Game session not found"
      });
    }

    res.json({
      success: true,
      message: "Game session updated",
      data: updatedSession
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


export const getAllGameSession = async (req, res) => {
  try {
    // 1️⃣ Read query params
    const { name, number, startDate, endDate, page = 1, limit = 10 } = req.query;

    // 2️⃣ Build dynamic filter
    const filter = {};

    if (name) {
      filter["profile.name"] = { $regex: name, $options: "i" }; // case-insensitive
    }

    if (number) {
      filter["profile.whatsapp"] = { $regex: number }; // partial match
    }

    // Date range filter (inclusive)
    if (startDate || endDate) {
      const createdAt = {};

      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart)) {
          createdAt.$gte = parsedStart;
        }
      }

      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd)) {
          // include entire end date
          parsedEnd.setHours(23, 59, 59, 999);
          createdAt.$lte = parsedEnd;
        }
      }

      if (Object.keys(createdAt).length) {
        filter.createdAt = createdAt;
      }
    }

    // 3️⃣ Pagination math
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // 4️⃣ Query DB
    const sessions = await GameSession.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    // 5️⃣ Total count (for frontend pagination)
    const total = await GameSession.countDocuments(filter);

    // 6️⃣ Response
    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      data: sessions
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
