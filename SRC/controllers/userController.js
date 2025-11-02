import User from '../models/user.models.js';


export const getUser = async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password -__v");
  
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
  
      res.json({ success: true, data: user });
  
    } catch (err) {
      console.error("getUser error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  };
  
  export const getAllUsers = async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search?.trim();
  
      const query = {};
  
      //search by name or email
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ];
      }
  
      const users = await User.find(query)
        .select("-password -__v")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
  
      const totalUsers = await User.countDocuments(query);
  
      res.json({
        success: true,
        results: users.length,
        page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        data: users
      });
  
    } catch (err) {
      console.error("getAllUsers error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  };