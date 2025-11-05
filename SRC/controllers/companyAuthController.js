import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Company from '../models/companyModel.js';
import sendEmail from '../utils/sendEmail.js';

const signToken = (id, expiresIn = '1d') =>
  jwt.sign({ id, type: 'company' }, process.env.JWT_SECRET, { expiresIn });

export const registerCompany = async (req, res) => {
  try {
    const { name, email, companyName, password, confirmPassword, phoneNumber } = req.body;

    if (!name || !email || !companyName || !password || !confirmPassword || !phoneNumber) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    const existing = await Company.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const company = await Company.create({
      name, email,       companyName, password, phoneNumber
    });

    const verificationToken = signToken(company._id, '1h');
    const verificationUrl = `${process.env.FRONTEND_URL}/company/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: company.email,
      subject: 'Verify your company account',
      html: `<p>Hello ${company.name},</p>
             <p>Click the link below to verify your company account:</p>
             <a href="${verificationUrl}">Verify Company Email</a>`
    });

    return res.status(201).json({
      success: true,
      message: 'Company created. Check email to verify.',
      token: verificationToken,
      company: {
        id: company._id,
        email: company.email,
        companyName: company.companyName,
        name: company.name,
        phoneNumber: company.phoneNumber
      }
    });
  } catch (err) {
    console.error('registerCompany error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const verifyCompanyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    const company = await Company.findById(decoded.id);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    if (company.active) {
      return res.status(200).json({ success: true, message: 'Company already verified' });
    }

    company.active = true;
    await company.save();

    

    return res.status(200).json({ success: true, message: 'Company verified successfully' });
  } catch (err) {
    console.error('verifyCompanyEmail error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

    const company = await Company.findOne({ email }).select('+password +active +role');
    if (!company) return res.status(401).json({ success: false, error: 'Incorrect email or password' });

    if (company.active === false) return res.status(403).json({ success: false, error: 'Account not verified. Please verify your email.' });

    const valid = await company.correctPassword(password, company.password);
    if (!valid) return res.status(401).json({ success: false, error: 'Incorrect email or password' });

    const token = signToken(company._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        company: {
          id: company._id,
          name: company.name,
          email: company.email,
          companyName: company.companyName,
          role: company.role,
          phoneNumber: company.phoneNumber
        }
      }
    });
  } catch (err) {
    console.error('loginCompany error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const forgotCompanyPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const company = await Company.findOne({ email });
    if (!company) {
      return res.status(200).json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    company.passwordResetToken = hashedToken;
    company.passwordResetExpires = Date.now() + (60 * 60 * 1000);
    await company.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/company/reset-password?token=${resetToken}`;

    const html = `
      <p>Hello ${company.name || ''},</p>
      <p>You requested a password reset for your company account. Click the link to reset your password (expires in 1 hour).</p>
      <p><a href="${resetUrl}">Reset password</a></p>
    `;

    try {
      await sendEmail({ to: company.email, subject: 'Company password reset', html });
    } catch (emailErr) {
      company.passwordResetToken = undefined;
      company.passwordResetExpires = undefined;
      await company.save({ validateBeforeSave: false });
      console.error('sendEmail error:', emailErr);
      return res.status(500).json({ success: false, error: 'Could not send reset email. Try again later.' });
    }

    return res.status(200).json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('forgotCompanyPassword error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const resetCompanyPassword = async (req, res) => {
  try {
    const token = req.params.token || req.query.token || req.body.token;
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) return res.status(400).json({ success: false, error: 'Password and confirmPassword are required' });
    if (password !== confirmPassword) return res.status(400).json({ success: false, error: 'Passwords do not match' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const company = await Company.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!company) return res.status(400).json({ success: false, error: 'Token is invalid or has expired' });

    company.password = password;
    company.passwordResetToken = undefined;
    company.passwordResetExpires = undefined;
    await company.save();

    return res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('resetCompanyPassword error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
