export const generateRandomString = (length) => {
    const lowerCaseLetters = 'abcdefghijklmnopqrstuvwxyz';
    const upperCaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const allCharacters = lowerCaseLetters + upperCaseLetters + numbers;

    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * allCharacters.length);
        password += allCharacters[randomIndex];
    }

    return password;
}

// // Example usage:
// const passwordLength = 12;
// const newPassword = generateRandomPassword(passwordLength);
// console.log('Generated Password:', newPassword);