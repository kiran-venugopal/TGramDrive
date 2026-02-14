const { Api } = require('telegram');

try {
    console.log('Api.auth.SignIn exists:', !!Api.auth.SignIn);
    const signIn = new Api.auth.SignIn({
        phoneNumber: '+1234567890',
        phoneCodeHash: 'hash',
        phoneCode: '12345'
    });
    console.log('SignIn instance created:', signIn.className);
} catch (error) {
    console.error('Error:', error);
}
