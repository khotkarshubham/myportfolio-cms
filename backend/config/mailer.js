import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const EMAIL_USER = String(process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = String(process.env.EMAIL_PASS || "").trim();
const CONTACT_RECEIVER = String(
  process.env.CONTACT_RECEIVER || ""
).trim();

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const createTransporter = () => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Email credentials are not configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
};

const sendMail = async (subject, text) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Email credentials are not configured");
  }

  if (!CONTACT_RECEIVER || !isValidEmail(CONTACT_RECEIVER)) {
    throw new Error("CONTACT_RECEIVER is missing or invalid");
  }

  const cleanSubject = String(subject || "").trim();
  const cleanText = String(text || "").trim();

  if (!cleanSubject) {
    throw new Error("Email subject is required");
  }

  if (!cleanText) {
    throw new Error("Email body is required");
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: EMAIL_USER,
    to: CONTACT_RECEIVER,
    subject: cleanSubject,
    text: cleanText
  });
};

export default sendMail;
