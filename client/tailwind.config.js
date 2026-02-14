/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    bg: '#172229',
                    text: '#FDFBF7',
                    primary: '#44A1A0',
                    accent: '#EF959C',
                    dark: '#375a70'
                }
            }
        },
    },
    plugins: [],
}
