const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter;

// ==============================
// SMTP Configuration
// ==============================
if (
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log("✅ Mailer configured with SMTP transporter.");
} else {
  console.log(
    "⚠️ SMTP credentials not found. Falling back to Console Log Mode."
  );
}

// ==============================
// Common Email Template
// ==============================
const createEmailTemplate = ({
  title,
  subtitle,
  otp,
  message,
  footerMessage,
}) => {
  return `
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>

<body style="margin:0; padding:0; background:#141414; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#141414; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
          style="
            background:#1f1f1f;
            border-radius:18px;
            overflow:hidden;
            border:1px solid #2a2a2a;
            box-shadow:0 10px 30px rgba(0,0,0,0.5);
          ">

          <!-- Header -->
          <tr>
            <td
              style="
                background:linear-gradient(135deg,#E50914,#B20710);
                padding:35px;
                text-align:center;
              ">

              <h1 style="
                color:white;
                margin:0;
                font-size:36px;
                letter-spacing:2px;
                font-weight:bold;
              ">
                Nexora
              </h1>

              <p style="
                color:#f5f5f5;
                margin-top:12px;
                font-size:15px;
                letter-spacing:1px;
              ">
                Premium Streaming Experience
              </p>

            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:45px 35px; color:#ffffff;">

              <h2 style="
                margin-top:0;
                font-size:30px;
                color:#ffffff;
                margin-bottom:20px;
              ">
                ${title}
              </h2>

              <p style="
                font-size:16px;
                line-height:1.8;
                color:#cfcfcf;
                margin-bottom:20px;
              ">
                ${subtitle}
              </p>

              <p style="
                font-size:16px;
                line-height:1.8;
                color:#cfcfcf;
              ">
                ${message}
              </p>

              <!-- OTP BOX -->
              <div
                style="
                  background:#2b2b2b;
                  border:2px dashed #E50914;
                  border-radius:16px;
                  padding:30px;
                  margin:40px 0;
                  text-align:center;
                ">

                <p style="
                  margin:0 0 12px 0;
                  color:#aaaaaa;
                  font-size:14px;
                  letter-spacing:1px;
                ">
                  YOUR OTP CODE
                </p>

                <div
                  style="
                    font-size:44px;
                    font-weight:bold;
                    letter-spacing:12px;
                    color:#E50914;
                  ">
                  ${otp}
                </div>

              </div>

              <!-- Expiry Info -->
              <div
                style="
                  background:#262626;
                  padding:18px;
                  border-radius:12px;
                  margin-bottom:30px;
                ">

                <p style="
                  margin:0;
                  color:#d6d6d6;
                  line-height:1.7;
                  font-size:15px;
                ">
                  ⏰ This OTP will expire in
                  <strong style="color:#ffffff;">10 minutes</strong>.
                </p>

              </div>

              <p style="
                font-size:15px;
                color:#bdbdbd;
                line-height:1.8;
              ">
                ${footerMessage}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                background:#111111;
                padding:28px;
                text-align:center;
                border-top:1px solid #2a2a2a;
              ">

              <p style="
                margin:0;
                color:#888888;
                font-size:13px;
              ">
                This is an automated email. Please do not reply.
              </p>

              <p style="
                margin-top:12px;
                color:#666666;
                font-size:12px;
              ">
                © 2026 Nexora. All rights reserved.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};

// ==============================
// Send Verification Email
// ==============================
const sendVerificationEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Nexora Service" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify your email - Nexora",

    text: `Your verification OTP is: ${otp}. It is valid for 10 minutes.`,

    html: createEmailTemplate({
      title: "Verify Your Email",
      subtitle: "Welcome to Nexora 🎬",
      otp,
      message:
        "Use the OTP below to verify your email address and activate your account.",
      footerMessage:
        "If you didn’t create an account, you can safely ignore this email.",
    }),
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);

      console.log(
        `✅ Verification OTP email successfully sent to: ${email}`
      );
    } catch (error) {
      console.error("❌ Error sending verification email:", error);

      console.log(
        `[SMTP FAILED] FALLBACK OTP FOR ${email}: ${otp}`
      );
    }
  } else {
    console.log(`
========================================
[EMAIL SENT]
To: ${email}
Subject: Verify your email
OTP: ${otp}
========================================
`);
  }
};

// ==============================
// Send Password Reset Email
// ==============================
const sendPasswordResetEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Nexora Service" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset your password - Nexora",

    text: `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`,

    html: createEmailTemplate({
      title: "Reset Your Password",
      subtitle: "Password Recovery Request 🔐",
      otp,
      message:
        "We received a request to reset your password. Use the OTP below to complete the password reset process.",
      footerMessage:
        "If you didn’t request a password reset, please secure your account immediately.",
    }),
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);

      console.log(
        `✅ Password reset OTP email successfully sent to: ${email}`
      );
    } catch (error) {
      console.error("❌ Error sending password reset email:", error);

      console.log(
        `[SMTP FAILED] FALLBACK RESET OTP FOR ${email}: ${otp}`
      );
    }
  } else {
    console.log(`
========================================
[EMAIL SENT]
To: ${email}
Subject: Reset your password
OTP: ${otp}
========================================
`);
  }
};

// ==============================
// Exports
// ==============================
module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};