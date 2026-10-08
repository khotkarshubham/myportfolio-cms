export const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api",
});

export const setAuthCookie = (res, token) => {
  res.cookie("token", token, { ...authCookieOptions(), maxAge: 60 * 60 * 1000 });
};
