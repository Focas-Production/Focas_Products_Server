export const auditCourseTemplate = async (req, res) => {
  try {
    const { to, name, orderId, amount,phoneNumber } = req.body;

    // basic validation
    if (!to || !name || !orderId || !amount) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const payload = {
      to,
      content_type: "template",
      template: {
        id: "24966000003235262",
        params: {
          "1": name,
          "2": orderId,
          "3": amount,
          "4": phoneNumber
        }
      }
    };

    const response = await fetch("https://api.convonite.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CHATZEAL_API_KEY,
        "x-channel-id": "24966000000395327"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ success: false, data });
    }

    return res.json({ success: true, data });

  } catch (error) {
    console.error("WhatsApp error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const PAYMENT_PRICES = {
  PER_PAPER: 350,
  PER_GROUP: 800,
  BOTH_GROUPS: 1500
};

export const rtiTemplate = async (req, res) => {
  try {
    const { to, name, orderId, paymentOption } = req.body;

    // basic validation
    if (!to || !name || !orderId || !paymentOption) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // validate payment option
    const amount = PAYMENT_PRICES[paymentOption];

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment option"
      });
    }

    const payload = {
      to,
      content_type: "template",
      template: {
        id: "24966000003233489",
        params: {
          "1": name,
          "2": orderId,
          "3": paymentOption,
          "4": amount.toString(),
          "5": "6383514285" // support number
        }
      }
    };

    const response = await fetch("https://api.convonite.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CHATZEAL_API_KEY,
        "x-channel-id": "24966000000395327"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        data
      });
    }

    return res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error("WhatsApp error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const plannerTemplate = async (req, res) => {
  try {
    const { to, name, orderId, amount} = req.body;

    // basic validation
    if (!to || !name || !orderId || !amount ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const payload = {
      to,
      content_type: "template",
      template: {
        id: "24966000003235366", // same as curl
        params: {
          "1": name,          // Dinesh
          "2": orderId,       // order_RsEL9hxqdvznmE
          "3": amount,        // 750
          "4": "63835 14285"    // 9361537780
        }
      }
    };

    const response = await fetch("https://api.convonite.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CHATZEAL_API_KEY,
        "x-channel-id": "24966000000395327"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        data
      });
    }

    return res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error("WhatsApp error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const createChatzealContact=async(req,res)=>{
  const {name,mobile}=req.body
  if(!name || !mobile){
    return res.status(404).json({
      success: false,
      message:"Name and Email required for create a Contact"
    })
  }

  try {
      const payload = {
      name,mobile
    };

    const response = await fetch("https://api.convonite.com/v1/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CHATZEAL_API_KEY,
        "x-channel-id": "24966000000395327"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        data
      });
    }

    return res.json({
      success: true,
      data
    });
    
  } catch (error) {
      console.error("WhatsApp error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}
