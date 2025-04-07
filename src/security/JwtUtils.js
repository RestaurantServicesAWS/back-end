import jwt from "jsonwebtoken";
export default class JwtUtils {
  static getJwt(serviceAccount) {
    return jwt.sign({ role: serviceAccount.role, email: serviceAccount._id }, process.env.JWT_SECRET, {
      subject: serviceAccount.username,
    });
  }
  static verifyJwt(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}