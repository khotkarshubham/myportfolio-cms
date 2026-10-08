import Contact from "../models/Contact.js";
import sendMail from "../config/mailer.js";
import { sanitizeText } from "../utils/sanitizeHtml.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

const EMAIL_REGEX =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

const normalizeEmail = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

const isValidEmail = (email) => {
  if (!email || email.length > 254) {
    return false;
  }

  return EMAIL_REGEX.test(email);
};

// Create Contact
export const createContact = async (req, res) => {
  try {
    const fields = { name: 100, email: 254, message: 2000 };
    for (const [field, max] of Object.entries(fields)) {
      const value = req.body?.[field];
      if (typeof value !== "string" || !value.trim() || value.length > max) {
        return sendError(res, `${field} is required and must be at most ${max} characters`, 400);
      }
    }
    const name = sanitizeText(req.body?.name, 100);
    const email = normalizeEmail(req.body?.email);
    const message = sanitizeText(req.body?.message, 2000);

    if (!name || !email || !message) {
      return sendError(
        res,
        "Name, email, and message are required",
        400
      );
    }

    if (!isValidEmail(email)) {
      return sendError(res, "Please provide a valid email address", 400);
    }

    const contact = await Contact.create({
      name,
      email,
      message
    });

    try {
      await sendMail(
        "New Portfolio Message",
        `
Name: ${name}
Email: ${email}

Message:
${message}
`
      );
    } catch (mailError) {
      console.error(
        "Contact email notification failed:",
        mailError?.message || mailError
      );
    }

    return sendSuccess(res, {
      message: "Message sent successfully"
    });
  } catch (error) {
    console.error("Create contact error:", error);

    return sendError(res, "Unable to send message", 500);
  }
};

// GET ALL CONTACTS (ADMIN INBOX)
export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, contacts);
  } catch (error) {
    console.error("Get contacts error:", error);

    return sendError(res, "Unable to load messages", 500);
  }
};

export const updateContact = async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return sendError(res, "Invalid message ID", 400);
    const updates = {};
    if (typeof req.body.read === "boolean") updates.readAt = req.body.read ? new Date() : null;
    if (typeof req.body.archived === "boolean") updates.archived = req.body.archived;
    if (!Object.keys(updates).length) return sendError(res, "Provide a read or archived status", 400);
    const contact = await Contact.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!contact) return sendError(res, "Message not found", 404);
    await logAdminAction(req, { action: typeof req.body.archived === "boolean" ? (req.body.archived ? "CONTACT_ARCHIVE" : "CONTACT_RESTORE") : (req.body.read ? "CONTACT_READ" : "CONTACT_UNREAD"), entity: "CONTACT", entityId: contact._id });
    return sendSuccess(res, contact);
  } catch { return sendError(res, "Unable to update message", 500); }
};

// DELETE MESSAGE
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return sendError(res, "Invalid message ID", 400);
    }

    const deleted = await Contact.findByIdAndDelete(id);

    if (!deleted) {
      return sendError(res, "Message not found", 404);
    }

    await logAdminAction(req, {
      action: "CONTACT_DELETE",
      entity: "CONTACT",
      entityId: deleted._id.toString()
    });

    return sendSuccess(res, {
      message: "Message deleted"
    });
  } catch (error) {
    console.error("Delete contact error:", error);

    return sendError(res, "Unable to delete message", 500);
  }
};
