import jwt from "jsonwebtoken";

const TOKEN_EXPIRES_IN = "1h";

const generateToken = (admin) => {
  if (!admin) {
    throw new Error("Admin is required to generate a token");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const id = admin._id || admin.id;

  if (!id) {
    throw new Error("Admin ID is required to generate a token");
  }

  return jwt.sign(
    {
      id: id.toString(),
      role: admin.role,
      email: admin.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRES_IN
    }
  );
};

export default generateToken;