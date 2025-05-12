# Next.js + Thirdweb Template

This is a template for building web3 applications with Next.js and Thirdweb authentication.

## Features

- Next.js 15 with App Router
- Thirdweb authentication with social login
- TypeScript support
- Tailwind CSS for styling
- Protected routes
- Wallet connection management

## Getting Started

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Thirdweb client ID:

   ```
   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication

This template uses Thirdweb for authentication. The following authentication methods are supported:

- Email
- Phone
- Passkey
- Guest
- Wallet
- Google
- Apple
- Facebook
- X (Twitter)
- Discord
- Telegram
- Twitch
- Farcaster
- Github
- Line
- Coinbase
- Steam

To configure which authentication methods are available, you'll need to set them up in your Thirdweb dashboard.

## Project Structure

- `app/` - Next.js app router pages and layouts
- `components/` - Reusable React components
- `public/` - Static assets
- `lib/` - Utility functions and shared code

## Learn More

To learn more about the technologies used in this template:

- [Next.js Documentation](https://nextjs.org/docs)
- [Thirdweb Documentation](https://portal.thirdweb.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
