class User {
    constructor(id, username) {
      this.id = id;
      this.username = username;
    }
  
    // Method to get user ID
    getId() {
      return this.id;
    }
  
    // Method to get username
    getUsername() {
      return this.username;
    }
  
    // Method to set username
    setUsername(username) {
      this.username = username;
    }
  }
  
  module.exports = User; // Export the User class
  