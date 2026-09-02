import AuthModel from "../models/authModel.js";

export default class AuthController {
  constructor() {
    this.model = new AuthModel();
  }

  async requireLogin() {
    const user = await this.model.me();

    if (!user) {
      window.location.href = "/login.html";

      return null;
    }

    return user;
  }

  async logout() {
    await this.model.logout();

    window.location.href = "/login.html";
  }
}
