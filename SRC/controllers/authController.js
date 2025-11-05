import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';

const signToken = (userId, expiresIn = '1d') =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const newUser = await User.create({ name, email, password, phone });

    const verificationToken = signToken(newUser._id, '1h');
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: newUser.email,
      subject: 'Verify your account',
      html: `<p>Hello ${newUser.name},</p>
             <p>Welcome to SmartTransit, Please click the link below to verify your email:</p>
             <a href="${verificationUrl}">Verify Email</a>`
    });

    res.status(201).json({
      success: true,
      message: 'User registered. Check email to verify.',
      token: verificationToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone
      }
    });
  } catch (error) {
    console.error('registerUser error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyUserEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.active) {
      return res.status(200).json({ success: true, message: 'User already verified' });
    }

    user.active = true;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to SmartTransit - Email Verified Successfully!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to SmartTransit!</h2>
            <p>Dear ${user.name || user.email},</p>
            <p>Your email has been successfully verified and your account is now active.</p>
            <p>You can now log in and start using SmartTransit, book your rides, and much more.</p>
            <br>
            <p>If you have any questions, feel free to contact our support team.</p>
            <br>
            <p>Best regards,<br>SmartTransit Team</p>2
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    res.status(200).json({ success: true, message: 'User verified successfully' });
  } catch (error) {
    console.error('verifyUserEmail error:', error);
    res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const user = await User.findOne({ email }).select('+password +active');
        if (!user) {
        return res.status(401).json({ success: false, error: 'Incorrect email or password' });
        }

        if (user.active === false) {
        return res.status(403).json({ success: false, error: 'Account not verified. Please verify your email.' });
        }

        const valid = await user.correctPassword(password, user.password);
        if (!valid) {
        return res.status(401).json({ success: false, error: 'Incorrect email or password' });
        }

        const token = signToken(user._id);


        return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            token,
            user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
            }
        }
        });
    } catch (err) {
        console.error('loginUser error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};


export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) {
        return res.status(200).json({ success: true, message: 'If you have an account with us with the email, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = Date.now() + (60 * 60 * 1000);

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(expires);
        await user.save({ validateBeforeSave: false }); 

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        const html = `
        <p>Hello ${user.name || ''},</p>
        <p>You requested a password reset. Click the link below to reset your password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>If you did not request this, please ignore this email.</p>
        `;

        try {
        await sendEmail({ to: user.email, subject: 'Password reset', html });
        } catch (emailErr) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error('sendEmail error:', emailErr);
        return res.status(500).json({ success: false, error: 'Could not send reset email. Try again later.' });
        }

        return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.'
        });
    } catch (err) {
        console.error('forgotPassword error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const token = req.params.token || req.query.token || req.body.token;
        if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

        const { password, confirmPassword } = req.body;
        if (!password || !confirmPassword) return res.status(400).json({ success: false, error: 'Password and confirmPassword are required' });
        if (password !== confirmPassword) return res.status(400).json({ success: false, error: 'Passwords do not match' });

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
        }).select('+passwordResetToken +passwordResetExpires');

        if (!user) return res.status(400).json({ success: false, error: 'Token is invalid or has expired' });

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return res.status(200).json({
        success: true,
        message: 'Password reset successful',
        });

    } catch (err) {
        console.error('resetPassword error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};

export const promoteToAdmin = async (req, res) => {
    try {
        const { userId, email } = req.body;
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'You are not authorized to promote users' });
        }
        if (!userId && !email) {
            return res.status(400).json({ success: false, error: 'Provide userId or email' });
        }

        const query = userId ? { _id: userId } : { email };
        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        if (user.role === 'admin') {
            return res.status(200).json({ success: true, message: 'User is already an admin' });
        }

        user.role = 'admin';
        user.active = true; 
        await user.save();

        return res.status(200).json({ success: true, message: 'User promoted to admin', user: { id: user._id, email: user.email, role: user.role } });
    } catch (err) {
    console.error('promoteToAdmin error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
    }
};


export const demoteFromAdmin = async (req, res) => {
  try {
      const { userId, email } = req.body;
      if (req.user.role !== 'admin') {
          return res.status(403).json({ success: false, error: 'You are not authorized to demote users' });
      }
      if (!userId && !email) {
          return res.status(400).json({ success: false, error: 'Provide userId or email' });
      }

      const query = userId ? { _id: userId } : { email };
      const user = await User.findOne(query);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      if (user.role !== 'admin') {
          return res.status(200).json({ success: true, message: 'User is not an admin' });
      }

      user.role = 'user';
      user.active = true; 
      await user.save();

      return res.status(200).json({ success: true, message: 'User demoted from admin', user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
  console.error('demoteFromAdmin error:', err);
  return res.status(500).json({ success: false, error: 'Server error' });
  }
};