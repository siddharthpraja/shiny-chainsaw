export default class DashboardView {

    constructor() {

        this.name =
            document.getElementById(
                "userName"
            );

        this.email =
            document.getElementById(
                "userEmail"
            );
    }


    showUser(user) {

        this.name.textContent =
            user.name;

        this.email.textContent =
            user.email;
    }
}
